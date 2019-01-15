import AWS from 'aws-sdk'
import fs from 'fs'
import path from 'path'
import mime from 'mime'

export async function walkSync(pathToFolder: string): Promise<any[]> {
  console.log(process.cwd )
  const files = fs.readdirSync(pathToFolder)
  const output = []
  for (const file of files) {
    const pathToFile = path.join(pathToFolder, file)
    const isDirectory = fs.statSync(pathToFile).isDirectory()
    if (isDirectory) {
      output.push(...await walkSync(pathToFile))
    } else {
      output.push(await pathToFile)
    }
  }
  return output
}

async function  internalUploadFolder(accessKeyIdPar: string,
                                     secretAccessKeyPar: string,
                                     s3BucketName: string,
                                     s3subFolder: string,
                                     localFolder: string)  {
  try {
    AWS.config.setPromisesDependency(Promise)
    const s3 = new AWS.S3({
      signatureVersion: 'v4',
      accessKeyId: accessKeyIdPar,
      secretAccessKey: secretAccessKeyPar,
    })

    const filesPaths = await walkSync(localFolder)
    for (let i = 0; i < filesPaths.length; i++) {
      const statistics = `(${i + 1}/${filesPaths.length}, ${Math.round((i + 1) / filesPaths.length * 100)}%)`
      const filePath = filesPaths[i]
      const fileContent = fs.readFileSync(filePath)
      // If the slash is like this "/" s3 will create a new folder, otherwise will not work properly.
      const relativeToBaseFilePath = path.normalize(path.relative(localFolder, filePath))
      let relativeToBaseFilePathForS3 = relativeToBaseFilePath.split(path.sep).join('/')
      relativeToBaseFilePathForS3 = path.join(s3subFolder, relativeToBaseFilePathForS3)
      const mimeType = mime.getType(filePath)
      console.log(`Uploading`, statistics, relativeToBaseFilePathForS3)
      // https://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/S3.html#putObject-property
      await s3.putObject({
        ACL: `public-read`,
        Bucket: s3BucketName,
        Key: relativeToBaseFilePathForS3,
        Body: fileContent,
        ContentType: mimeType,
      } as AWS.S3.PutObjectRequest).promise()

      console.log(`Uploaded `, statistics, relativeToBaseFilePathForS3)
    }
    return true
  } catch (error) {
      console.error(error)
      return false
  }
}

export async function uploadFolder(folderPath: string, pkgName: string, branchName: string) {
  const accessKey = process.env.AWS_ACCESS_KEY_ID || 'not defined'
  const accessSecretID = process.env.AWS_SECRET_ID || 'not defined'
  const bucketName = process.env.AWS_BUCKET_NAME || 'not defined'
  const s3subfolder = path.join(pkgName, branchName)

  return await internalUploadFolder( accessKey, accessSecretID, bucketName, s3subfolder, folderPath)
}
