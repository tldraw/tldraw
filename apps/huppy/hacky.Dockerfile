# this is extremely hacky and will only work for this one time :)

# it seems that fly.io CLI somehow builds the image differently from
# pure docker and just hangs, consuming one full core; so instead of
# building and deploying, build separately through docker and then
# just reuse the image
# current workflow:
# docker build --progress plain -f apps/huppy/Dockerfile -t dgroshev/huppy --platform linux/amd64 .
# docker push dgroshev/huppy
# [adjust the image hash below]
# fly deploy --config apps/huppy/fly.toml --dockerfile apps/huppy/hacky.Dockerfile --local-only
FROM dgroshev/huppy@sha256:88a95b27cd8bcbe3f97874cbe9dac25043eb56a0b2189af3c9d84da9911d9fb9