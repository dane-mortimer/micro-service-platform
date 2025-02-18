#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import CONFIGURATION, { IEnvConfig } from '../config/config';
import { MicroServicePlatformStack } from '../lib/stack';

const app = new cdk.App();

/**
 * Name of the environment, dev, beta, gamma, prod
 */
const environment: string = app.node.getContext('environment');

/**
 * Environment specific configuration.
 */
const config: IEnvConfig = CONFIGURATION[environment];

new MicroServicePlatformStack(app, 'MicroServicePlatformServicesStack', {
    env: {
        account: config.account,
        region: config.region,
    },
    config,
    environment,
    appName: 'example-app',
});
