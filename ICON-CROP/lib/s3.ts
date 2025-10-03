import * as s3 from 'aws-cdk-lib/aws-s3';
import { Construct } from 'constructs';

export function createIconBuckets(scope:Construct): { iconSource: s3.Bucket, iconDest: s3.Bucket } {

    const iconSource = new s3.Bucket(scope, 'iconSource');

    const iconDest = new s3.Bucket(scope, 'iconDest', {
        blockPublicAccess: new s3.BlockPublicAccess({
            blockPublicAcls: false,
            blockPublicPolicy: false,
            ignorePublicAcls: false,
            restrictPublicBuckets: false,
          }),
        publicReadAccess: true,
        
    });
    
    
    return {iconSource, iconDest}
}
