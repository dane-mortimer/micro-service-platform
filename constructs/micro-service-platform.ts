import { RemovalPolicy } from 'aws-cdk-lib';
import { Vpc } from 'aws-cdk-lib/aws-ec2';
import { Cluster, ContainerInsights } from 'aws-cdk-lib/aws-ecs';
import { Key } from 'aws-cdk-lib/aws-kms';
import { Construct } from 'constructs';
import { EcsFargateService } from './services/ecs-fargate-service';
import { IECSService } from './interfaces/IECSService';
import { LoadBalancer } from './components/load-balancer';

export interface MicroServicePlatformProps {
    maxAzs?: 2;
    services: IECSService[];
    serviceConnectNamepsace: string;
    removalPolicy?: RemovalPolicy;
}

export class MicroServicePlatform extends Construct {
    constructor(scope: Construct, id: string, props: MicroServicePlatformProps) {
        super(scope, id);

        const removalPolicy = props.removalPolicy ? props.removalPolicy : RemovalPolicy.RETAIN_ON_UPDATE_OR_DELETE;

        const vpc = new Vpc(this, 'Vpc', {
            maxAzs: props.maxAzs ? props.maxAzs : 2,
        });

        const cluster = new Cluster(this, 'Cluster', {
            vpc: vpc,
            enableFargateCapacityProviders: true,
            containerInsightsV2: ContainerInsights.ENABLED,
        });

        const serviceConnectNamepsace = cluster.addDefaultCloudMapNamespace({
            name: props.serviceConnectNamepsace,
            useForServiceConnect: true,
        });

        const encryptionKey = new Key(this, 'Kms', {
            removalPolicy,
        });

        props.services.forEach((serviceDefinition: IECSService) => {
            const serviceConstruct = new EcsFargateService(this, serviceDefinition.name, {
                vpc,
                cluster,
                encryptionKey,
                service: serviceDefinition,
                serviceConnectNamespace: serviceConnectNamepsace.namespaceName,
                removalPolicy,
            });

            if (serviceDefinition.loadBalancerSettings) {
                new LoadBalancer(this, `${serviceDefinition.name}`, {
                    vpc,
                    containerPort: serviceDefinition.port,
                    port: serviceDefinition.loadBalancerSettings.port,
                    ingressPeer: serviceDefinition.loadBalancerSettings.peer,
                    target: serviceConstruct.service,
                    serviceSecurityGroup: serviceConstruct.serviceSecurityGroup,
                });
            }
        });
    }
}
