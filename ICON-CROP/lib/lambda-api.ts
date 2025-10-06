import * as lambda from 'aws-cdk-lib/aws-lambda';
import { Construct } from 'constructs';
import { ApiGatewayToLambda } from '@aws-solutions-constructs/aws-apigateway-lambda';

export function createLambdaApiGateway(scope: Construct, iconSourceName: string, iconDestName: string): ApiGatewayToLambda {
    const iconCrop = new ApiGatewayToLambda(scope, 'IconCrop', {
        lambdaFunctionProps: {
            runtime: lambda.Runtime.NODEJS_20_X,
            handler: 'index.handler',
            code: lambda.Code.fromAsset('lambda/function.zip'),
            architecture: lambda.Architecture.ARM_64,
            environment: {
                SOURCE_BUCKET: iconSourceName,
                DESTINATION_BUCKET: iconDestName,
                },
        },
        apiGatewayProps: {
            restApiName: 'Icon Cropper',
            description: 'Resize and crop user-submitted icons'
          }
    });

    return iconCrop;
}