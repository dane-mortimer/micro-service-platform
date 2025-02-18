import { IService } from "../constructs/ecs-fargate-service"
import path = require("path");

export interface IConfig {
  [key: string]: IEnvConfig
}

export interface IEnvConfig {
  account: string;
  region: string;
  services: IService[];
}

const CONFIGURATION: IConfig = {
  'dev': {
    account: '12345678901',
    region: 'eu-west-1',
    services: [
      {
        serviceDockerfileDirectory: path.join(__dirname, '../services/user-service'),
        name: 'user-service', 
        containerPort: 80,
        taskRolePolicies: [], 
      },
      {
        serviceDockerfileDirectory: path.join(__dirname, '../services/movie-service'),
        name: 'movie-service', 
        dependentServices: [
          {
            name: 'user-service',
            port: 80
          }
        ],
        taskRolePolicies: []
      },
    ]
  },
}

export default CONFIGURATION;