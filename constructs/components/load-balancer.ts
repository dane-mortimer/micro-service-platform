import { IPeer, Peer, Port, SecurityGroup, Vpc } from 'aws-cdk-lib/aws-ec2';
import {
    ApplicationLoadBalancer,
    ApplicationProtocol,
    ApplicationTargetGroup,
    IApplicationLoadBalancerTarget,
    TargetType,
} from 'aws-cdk-lib/aws-elasticloadbalancingv2';
import { Construct } from 'constructs';

// TODO: Update this construct to use a certificate
export interface LoadBalancerProps {
    /**
     * Vpc where the load balancer is placed
     */
    vpc: Vpc;

    /**
     * Port to access load balancer on
     */
    port: number;

    /**
     * Port for container or service, this where the target group will be mapped to
     */
    containerPort?: number;

    /**
     * Whether the loadbalancer should be placed in public subnets
     */
    internetFacing?: boolean;

    /**
     * Ingress peer, e.g. CIDR range to allow access to load balancer
     */
    ingressPeer: IPeer;

    /**
     * Target group targets, e.g. ECS Service, Autoscaling Group, Lambda Function
     */
    target: IApplicationLoadBalancerTarget;

    /**
     * Service security group, this is to allow access from load balancer security group
     */
    serviceSecurityGroup: SecurityGroup;
}

export class LoadBalancer extends Construct {
    constructor(scope: Construct, id: string, props: LoadBalancerProps) {
        super(scope, id);

        const internetFacing = props.internetFacing ? props.internetFacing : false;
        const containerPort = props.containerPort ? props.containerPort : 80;

        const loadBalancerSecurityGroup = new SecurityGroup(this, 'loadbalancer-sg', {
            allowAllOutbound: false,
            vpc: props.vpc,
        });

        const loadBalancer = new ApplicationLoadBalancer(this, 'load-balancer', {
            vpc: props.vpc,
            internetFacing,
        });

        const targetGroup = new ApplicationTargetGroup(this, 'MyTargetGroup', {
            vpc: props.vpc,
            port: containerPort,
            protocol: ApplicationProtocol.HTTP,
            targetType: TargetType.IP,
        });

        loadBalancer.addListener('listener', {
            port: props.port,
            defaultTargetGroups: [targetGroup],
        });

        targetGroup.addTarget(props.target);

        props.serviceSecurityGroup.addIngressRule(
            Peer.securityGroupId(loadBalancerSecurityGroup.securityGroupId),
            Port.tcp(containerPort),
        );

        loadBalancerSecurityGroup.addIngressRule(props.ingressPeer, Port.tcp(props.port));
    }
}
