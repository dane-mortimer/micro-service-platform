
import { Duration, RemovalPolicy } from 'aws-cdk-lib';
import { Cluster, ContainerImage, FargateService, FargateTaskDefinition, LogDriver } from 'aws-cdk-lib/aws-ecs';
import { Effect, ManagedPolicy, PolicyStatement, Role, ServicePrincipal } from 'aws-cdk-lib/aws-iam';
import { LogGroup, RetentionDays } from 'aws-cdk-lib/aws-logs';
import { Construct } from 'constructs';
import { shouldBeAlphaHyphenString } from '../utils/utils'; 
import { LoadBalancer } from 'aws-cdk-lib/aws-elasticloadbalancing';
import { IPeer, Peer, Port, SecurityGroup } from 'aws-cdk-lib/aws-ec2';
import { ApplicationProtocol, ApplicationTargetGroup, TargetType } from 'aws-cdk-lib/aws-elasticloadbalancingv2';
import { Key } from 'aws-cdk-lib/aws-kms';

export interface IDependentService {
  name: string,

  port: number,
}

export interface IService {
  /**
   * Required: Service name
   */
  name: string;

  /**
   * Required: List of depedent service names
   */
  dependentServices?: IDependentService[];

  /**
   * Required: Directory of service dockerfile
   */
  serviceDockerfileDirectory: string;

  /**
   * Required: Arn for task role
   * 
   * @default - Base cloudwatch permissions to push logs and put metric data
   */
  taskRolePolicies: PolicyStatement[];
  
  /**
   * Desired fargate task count
   * 
   * @default 1
   */
  desiredCapacity?: number;
  
  /**
   * Minimum fargate task count
   * 
   * @default 1
   */
  minCapacity?: number;

  /**
   * Maximum fargate task count
   * 
   * @default 10
   */
  maxCapacity?: number;

  /**
   * Container CPU Utilization
   * 
   * @default 256
   */
  containerCpu?: number; 

  /**
   * Container Memory in MiB
   * 
   * @default 512
   */
  containerMemory?: number;

  /**
   * Port container is mapped to 
   * 
   * @default 80
   */
  containerPort?: number;

  /**
   * Load Balancer settings. 
   * 
   * @default - No load balancer
   */
  loadBalancerSettings?: {
    /**
     * Port number
     */
    port: number;
    publicFacing: boolean;
    ingressRule: {
      peer: IPeer,
      port: Port
    },
  }

  /**
   * Whether resources are removed or retained. Set to RemovalPolicy.DESTROY for personal stacks
   * 
   * @default RemovalPolicy.RETAIN_ON_UPDATE_OR_DELETE
   */
  removalPolicy?: RemovalPolicy
}

export interface EcsFargateServiceProps extends IService {
  /**
   * Required: ECS Cluster
   */
  cluster: Cluster, 

  /**
   * Required: Service connect namespace
   */
  serviceConnectNamespace: string;

  /**
   * Retention Period for logs stored in Cloudwatch
   * 
   * @default RetentionDays.ONE_WEEK 
   */
  logRetentionPeriod?: RetentionDays,

  encryptionKey: Key
}

/**
 * Ecs Fargate Service is built with log groups, cloud map enabled for DNS communication between services.
 * 
 * Customizable container CPU and memory can be specified as arguments. 
 */
export class EcsFargateService extends Construct {

  readonly fargateService: FargateService

  constructor(scope: Construct, id: string, props: EcsFargateServiceProps) {
    super(scope, id);

    const name = shouldBeAlphaHyphenString(props.name); 

    const containerPort: number = props.containerPort ? props.containerPort : 80; 
    const containerMemory = props.containerMemory ? props.containerMemory : 512;
    const containerCpu = props.containerCpu ? props.containerCpu : 256;
    const logRetentionPeriod = props.logRetentionPeriod ? props.logRetentionPeriod : RetentionDays.ONE_WEEK; 
    const removalPolicy = props.removalPolicy ? props.removalPolicy : RemovalPolicy.RETAIN_ON_UPDATE_OR_DELETE
    const encryptionKey = props.encryptionKey;

    const logGroup = new LogGroup(this, 'log-group', {
      logGroupName: `/ecs/${name}`,
      retention: logRetentionPeriod,
      removalPolicy,
      encryptionKey,
    });

    props.taskRolePolicies.push(new PolicyStatement({
      actions: [
        "logs:CreateLogGroup",
        "logs:CreateLogStream",
        "logs:PutLogEvents",
        "logs:DescribeLogStreams"
      ],
      effect: Effect.ALLOW,
      resources: [ `${logGroup.logGroupArn}:*` ]
    }));

    props.taskRolePolicies.push(new PolicyStatement({
      actions: [
        "cloudwatch:PutMetricData"
      ],
      effect: Effect.ALLOW,
      resources: [ "*" ]
    }));

    const taskRolePolicy = new ManagedPolicy(this, 'managed-policy', {
      statements: props.taskRolePolicies,
    }); 
    
    const taskRole = new Role(this, 'role', {
      assumedBy: new ServicePrincipal('ecs-tasks.amazonaws.com'),
      managedPolicies: [taskRolePolicy],
    });

    const taskDefinition = new FargateTaskDefinition(this, `task-definition`, {
      taskRole,
      cpu: containerCpu,
      memoryLimitMiB: containerMemory,
    }); 

    const environment = this.dependentServiceEnvironmentBuilder(props.dependentServices, props.serviceConnectNamespace)

    taskDefinition.addContainer(`container-definition`, {
      image: ContainerImage.fromAsset(props.serviceDockerfileDirectory),
      logging: LogDriver.awsLogs({
        streamPrefix: name,
        logGroup: logGroup,
        datetimeFormat: '%Y-%m-%dT%H:%M:%SZ', 
        multilinePattern: '^\\[\\d{4}-\\d{2}-\\d{2}',
      }),
      environment,
      portMappings: [{ 
        name, 
        containerPort: containerPort, 
        hostPort: containerPort 
      }],
    }); 

    const serviceSecurityGroup = new SecurityGroup(this, 'service-sg', {
      allowAllOutbound: false,
      vpc: props.cluster.vpc,
    })

    this.fargateService = new FargateService(this, 'service-definition', {
      taskDefinition, 
      cluster: props.cluster, 
      desiredCount: props.desiredCapacity ? props.desiredCapacity : 1,
      serviceConnectConfiguration: {
        namespace: props.cluster.defaultCloudMapNamespace?.namespaceName,
        services: [{
          portMappingName: name,
          port: containerPort, 
        }]
      },
      securityGroups: [serviceSecurityGroup],
    });

    const scaling = this.fargateService.autoScaleTaskCount({
      minCapacity: props.minCapacity ? props.minCapacity : 1,
      maxCapacity: props.maxCapacity ? props.maxCapacity : 10, 
    });

    scaling.scaleOnCpuUtilization('CpuScaling', {
      targetUtilizationPercent: 50, 
      scaleInCooldown: Duration.seconds(60),
      scaleOutCooldown: Duration.seconds(60),
    });

    scaling.scaleOnMemoryUtilization('MemoryScaling', {
      targetUtilizationPercent: 50, 
      scaleInCooldown: Duration.seconds(60),
      scaleOutCooldown: Duration.seconds(60),
    });

    if (props.loadBalancerSettings) {

      const loadBalancerSecurityGroup = new SecurityGroup(this, `loadbalancer-sg`, {
        allowAllOutbound: false,
        vpc: props.cluster.vpc
      }); 

      const loadBalancer = new LoadBalancer(this, 'load-balancer', {
        vpc: props.cluster.vpc,
        internetFacing: props.loadBalancerSettings.publicFacing,
      });

      const targetGroup = new ApplicationTargetGroup(this, 'MyTargetGroup', {
        vpc: props.cluster.vpc,
        port: containerPort, 
        protocol: ApplicationProtocol.HTTP,
        targetType: TargetType.IP,
      });

      loadBalancer.addListener({
        externalPort: props.loadBalancerSettings.port,
      });
      
      targetGroup.addTarget(this.fargateService); 

      serviceSecurityGroup.addIngressRule(
        Peer.securityGroupId(loadBalancerSecurityGroup.securityGroupId), 
        Port.tcp(containerPort)
      );

      loadBalancerSecurityGroup.addIngressRule(props.loadBalancerSettings.ingressRule.peer, props.loadBalancerSettings.ingressRule.port)
    }
  }

  dependentServiceEnvironmentBuilder(dependentServices: IDependentService[] | undefined, namespace: string): { [key: string]: string } {
    const environmentVariables: { [key: string]: string } = {};
    
    if (!dependentServices) 
      return {}

    dependentServices.forEach((service: IDependentService) => {
      const key: string = `${service.name.toUpperCase().replace('-','_')}_DNS`
      environmentVariables[key] = `${service}.${namespace}:${service.port}`
    });

    return environmentVariables
  }
}
