# Causalist Infrastructure

```mermaid
---
title: AWS cloud infrastructure overview
---
flowchart LR
    user[[User]]
    subgraph AWS 
    cloudfront(Cloudfront):::aws
    s3_frontend("S3<br>(frontend code)"):::aws
    api(API Gateway):::aws
    lambda("Lambda<br>(backend code)"):::aws
    dynamo[(DynamoDB)]:::aws
    s3_documents("S3<br>(Uploads)"):::aws
    end
    
    user -. "http://..." .-> cloudfront
    cloudfront -- "#42;" --> s3_frontend
    cloudfront -- "/api" --> api
    api --> lambda
    lambda --> dynamo
    lambda --> s3_documents
    
    classDef aws fill:#f79d36,stroke:#623e15
```
