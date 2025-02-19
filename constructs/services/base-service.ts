import { RemovalPolicy } from 'aws-cdk-lib';
import { AutoScalingGroup } from 'aws-cdk-lib/aws-autoscaling';
import { SecurityGroup, Vpc } from 'aws-cdk-lib/aws-ec2';
import { FargateService } from 'aws-cdk-lib/aws-ecs';
import { LambdaFunction } from 'aws-cdk-lib/aws-events-targets';
import { Key } from 'aws-cdk-lib/aws-kms';
import { RetentionDays } from 'aws-cdk-lib/aws-logs';
import { Construct } from 'constructs';

export interface BaseServiceProps {
    /**
     * Retention Period for logs stored in Cloudwatch
     *
     * @default RetentionDays.ONE_WEEK
     */
    logRetentionPeriod?: RetentionDays;

    /**
     * Vpc where the service will be placed
     */
    vpc: Vpc;

    /**
     * Encryption key for data at rest
     */
    encryptionKey: Key;

    /**
     * Removal policy for resources that contain removalPolicy attribute
     */
    removalPolicy: RemovalPolicy;
}

export abstract class BaseService extends Construct {
    readonly serviceSecurityGroup: SecurityGroup;
    service: FargateService | AutoScalingGroup | LambdaFunction;

    constructor(scope: Construct, id: string, props: BaseServiceProps) {
        super(scope, id);

        this.serviceSecurityGroup = new SecurityGroup(this, 'service-sg', {
            allowAllOutbound: false,
            vpc: props.vpc,
        });
    }
}
