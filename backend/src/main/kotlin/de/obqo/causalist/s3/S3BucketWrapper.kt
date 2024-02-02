package de.obqo.causalist.s3

import dev.forkhandles.result4k.onFailure
import org.http4k.connect.amazon.s3.S3Bucket
import org.http4k.connect.amazon.s3.copyObject
import org.http4k.connect.amazon.s3.deleteObject
import org.http4k.connect.amazon.s3.model.BucketKey
import org.http4k.connect.amazon.s3.model.BucketName

class S3BucketWrapper(val bucketName: BucketName, private val delegate: S3Bucket) : S3Bucket by delegate {

    fun moveObject(fromKey: BucketKey, toKey: BucketKey, afterCopy: () -> Unit = {}) {
        copyObject(bucketName, fromKey, toKey).onFailure { it.reason.throwIt() }
        afterCopy()
        deleteObject(fromKey).onFailure { it.reason.throwIt() }
    }
}
