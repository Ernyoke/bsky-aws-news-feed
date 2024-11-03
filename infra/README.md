# infra

This is the infrastructure for the [AWS News Feed on 🦋](https://bsky.app/profile/awsrecentnews.bsky.social) bot.

## Deployments Steps

```
cd infra
cp input.tfvars.example input.tfvars
# Fill in the missing values
terraform apply -var-file="input.tfvars"
```