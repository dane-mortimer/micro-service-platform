import { IPeer, Peer, Port, SecurityGroup, Vpc } from 'aws-cdk-lib/aws-ec2';
import {
    ApplicationLoadBalancer,
    ApplicationProtocol,
    ApplicationTargetGroup,
    IApplicationLoadBalancerTarget,
    TargetType,
} from 'aws-cdk-lib/aws-elasticloadbalancingv2';
import { Construct } from 'constructs';

export interface LoadBalancerProps {
    vpc: Vpc;
    port: number;
    containerPort?: number;
    internetFacing?: boolean;
    ingressPeer: IPeer;
    target: IApplicationLoadBalancerTarget;
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
