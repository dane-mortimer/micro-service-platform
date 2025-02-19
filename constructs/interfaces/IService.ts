import { IPeer } from 'aws-cdk-lib/aws-ec2';
import { IBaseService } from './IBaseService';

export interface IService extends IBaseService {
    /**
     * Required: List of depedent service names
     */
    dependentServices?: IBaseService[];

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
        peer: IPeer;
    };
}
