import aws from 'aws-sdk'

export default async function handler(req, res) {
  aws.config.update({
    accessKeyId: process.env.TL_AWS_ACCESS_KEY,
    secretAccessKey: process.env.TL_AWS_SECRET_KEY,
    region: process.env.TL_AWS_REGION,
    signatureVersion: 'v4',
  })

  const s3 = new aws.S3()

  const post = s3.createPresignedPost({
    Bucket: process.env.TL_AWS_BUCKET_NAME,
    Fields: {
      key: req.query.file,
      'Content-Type': req.query.fileType,
    },
    Expires: 60, // seconds
    Conditions: [
      ['content-length-range', 0, 5242880], // up to 5 MB
    ],
  })

  res.status(200).json(post)
}
