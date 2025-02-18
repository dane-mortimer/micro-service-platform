import { Environment, Stack, StackProps } from "aws-cdk-lib";
import { Construct } from "constructs";
import { MicroServicePlatform } from "../constructs/micro-service-platform";
import { IEnvConfig } from "../config/config";



export interface MicroServicePlatformStackProps extends StackProps {
  /**
   * Name of the environment
   */
  environment: string;

  /**
   * Environment specific configuration
   */
  config: IEnvConfig;

  /**
   * Name of the application. Used for Id's and naming of resources.
   */
  appName: string;
}

export class MicroServicePlatformStack extends Stack {

  constructor(scope: Construct, id: string, props: MicroServicePlatformStackProps) {
    super(scope, id);

    new MicroServicePlatform(this, `${props.appName}-${props.environment}`, {
      services: props.config.services,
      serviceConnectNamepsace: `${props.appName}-ms-platform-${props.environment}`
    });
  }
}