import { PolicyStatement } from 'aws-cdk-lib/aws-iam';
import { RemovalPolicy } from 'aws-cdk-lib';
import { IService } from './IService';

export interface IECSService extends IService {
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
     * Whether resources are removed or retained. Set to RemovalPolicy.DESTROY for personal stacks
     *
     * @default RemovalPolicy.RETAIN_ON_UPDATE_OR_DELETE
     */
    removalPolicy?: RemovalPolicy;
}
