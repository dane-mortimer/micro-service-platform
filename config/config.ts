import path = require('path');
import { IECSService } from '../constructs/interfaces/IECSService';

export interface IConfig {
    [key: string]: IEnvConfig;
}

export interface IEnvConfig {
    account: string;
    region: string;
    services: IECSService[];
}

const CONFIGURATION: IConfig = {
    dev: {
        account: '12345678901',
        region: 'eu-west-1',
        services: [
            {
                serviceDockerfileDirectory: path.join(__dirname, '../services/user-service'),
                name: 'user-service',
                port: 80,
                taskRolePolicies: [],
            },
            {
                serviceDockerfileDirectory: path.join(__dirname, '../services/movie-service'),
                name: 'movie-service',
                dependentServices: [
                    {
                        name: 'user-service',
                        port: 80,
                    },
                ],
                taskRolePolicies: [],
            },
        ],
    },
};

export default CONFIGURATION;
