import { Duration, RemovalPolicy } from 'aws-cdk-lib';
import { Cluster, ContainerImage, FargateService, FargateTaskDefinition, LogDriver } from 'aws-cdk-lib/aws-ecs';
import { Effect, ManagedPolicy, PolicyStatement, Role, ServicePrincipal } from 'aws-cdk-lib/aws-iam';
import { LogGroup, RetentionDays } from 'aws-cdk-lib/aws-logs';
import { Construct } from 'constructs';
import { shouldBeAlphaHyphenString } from '../../utils/utils';
import { IECSService } from '../interfaces/IECSService';
import { IBaseService } from '../interfaces/IBaseService';
import { BaseService, BaseServiceProps } from './base-service';

export interface EcsFargateServiceProps extends BaseServiceProps {
    /**
     * Required: ECS Cluster
     */
    cluster: Cluster;

    /**
     * ECS Service Configuration
     */
    service: IECSService;

    /**
     * Required: Service connect namespace
     */
    serviceConnectNamespace: string;
}

/**
 * Ecs Fargate Service is built with log groups, cloud map enabled for DNS communication between services.
 *
 * Customizable container CPU and memory can be specified as arguments.
 */
export class EcsFargateService extends BaseService {
    readonly service: FargateService;

    constructor(scope: Construct, id: string, props: EcsFargateServiceProps) {
        super(scope, id, props);

        const name = shouldBeAlphaHyphenString(props.service.name);

        const containerPort: number = props.service.port ? props.service.port : 80;
        const containerMemory = props.service.containerMemory ? props.service.containerMemory : 512;
        const containerCpu = props.service.containerCpu ? props.service.containerCpu : 256;
        const logRetentionPeriod = props.logRetentionPeriod ? props.logRetentionPeriod : RetentionDays.ONE_WEEK;
        const removalPolicy = props.removalPolicy ? props.removalPolicy : RemovalPolicy.RETAIN_ON_UPDATE_OR_DELETE;
        const encryptionKey = props.encryptionKey;

        const logGroup = new LogGroup(this, 'log-group', {
            logGroupName: `/ecs/${name}`,
            retention: logRetentionPeriod,
            removalPolicy,
            encryptionKey,
        });

        props.service.taskRolePolicies.push(
            new PolicyStatement({
                actions: [
                    'logs:CreateLogGroup',
                    'logs:CreateLogStream',
                    'logs:PutLogEvents',
                    'logs:DescribeLogStreams',
                ],
                effect: Effect.ALLOW,
                resources: [`${logGroup.logGroupArn}:*`],
            }),
        );

        props.service.taskRolePolicies.push(
            new PolicyStatement({
                actions: ['cloudwatch:PutMetricData'],
                effect: Effect.ALLOW,
                resources: ['*'],
            }),
        );

        const taskRolePolicy = new ManagedPolicy(this, 'managed-policy', {
            statements: props.service.taskRolePolicies,
        });

        const taskRole = new Role(this, 'role', {
            assumedBy: new ServicePrincipal('ecs-tasks.amazonaws.com'),
            managedPolicies: [taskRolePolicy],
        });

        const taskDefinition = new FargateTaskDefinition(this, 'task-definition', {
            taskRole,
            cpu: containerCpu,
            memoryLimitMiB: containerMemory,
        });

        const environment = this.dependentServiceEnvironmentBuilder(
            props.service.dependentServices,
            props.serviceConnectNamespace,
        );

        taskDefinition.addContainer('container-definition', {
            image: ContainerImage.fromAsset(props.service.serviceDockerfileDirectory),
            logging: LogDriver.awsLogs({
                streamPrefix: name,
                logGroup: logGroup,
                datetimeFormat: '%Y-%m-%dT%H:%M:%SZ',
                multilinePattern: '^\\[\\d{4}-\\d{2}-\\d{2}',
            }),
            environment,
            portMappings: [
                {
                    name,
                    containerPort: containerPort,
                    hostPort: containerPort,
                },
            ],
        });

        this.service = new FargateService(this, 'service-definition', {
            taskDefinition,
            cluster: props.cluster,
            desiredCount: props.service.desiredCapacity ? props.service.desiredCapacity : 1,
            serviceConnectConfiguration: {
                namespace: props.cluster.defaultCloudMapNamespace?.namespaceName,
                services: [
                    {
                        portMappingName: name,
                        port: containerPort,
                    },
                ],
            },
            securityGroups: [this.serviceSecurityGroup],
        });

        const scaling = this.service.autoScaleTaskCount({
            minCapacity: props.service.minCapacity ? props.service.minCapacity : 1,
            maxCapacity: props.service.maxCapacity ? props.service.maxCapacity : 10,
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
    }

    dependentServiceEnvironmentBuilder(
        dependentServices: IBaseService[] | undefined,
        namespace: string,
    ): { [key: string]: string } {
        const environmentVariables: { [key: string]: string } = {};

        if (!dependentServices) return {};

        dependentServices.forEach((service: IBaseService) => {
            const key: string = `${service.name.toUpperCase().replace('-', '_')}_DNS`;
            environmentVariables[key] = `${service}.${namespace}:${service.port}`;
        });

        return environmentVariables;
    }
}
