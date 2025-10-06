import * as cdk from 'aws-cdk-lib';
import { createIconBuckets } from './s3';
import { Construct } from 'constructs';
import { createLambdaRole } from './iam';
// import * as sqs from 'aws-cdk-lib/aws-sqs';

export class IconCropStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const { iconSource, iconDest } = createIconBuckets(this);
    const lambdaRole = createLambdaRole(this, iconSource.bucketName, iconDest.bucketName);
    
  }
}
