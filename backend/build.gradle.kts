import com.adarshr.gradle.testlogger.theme.ThemeType

plugins {
    kotlin("jvm") version libs.versions.kotlin.get()
    alias(libs.plugins.ksp)
    alias(libs.plugins.shadow)
    alias(libs.plugins.test.logger)
    alias(libs.plugins.decycle)
    application
}

group = "de.obqo.causalist"
version = "1.0-SNAPSHOT"

repositories {
    mavenCentral()
}

dependencies {
    implementation(kotlin("stdlib"))

    implementation(platform(libs.http4k.bom))
    implementation("org.http4k:http4k-core")
    implementation("org.http4k:http4k-contract")
    implementation("org.http4k:http4k-multipart")
    implementation("org.http4k:http4k-format-moshi") {
        exclude("org.jetbrains.kotlin", "kotlin-reflect")
    }
    implementation("org.http4k:http4k-serverless-lambda")

    implementation(platform(libs.http4k.connect.bom))
    implementation("org.http4k:http4k-connect-amazon-dynamodb")

    implementation(libs.kotshi.api)
    ksp(libs.kotshi.compiler)
    implementation(libs.rtfparserkit)

    implementation(platform(libs.slf4j.bom))
    implementation("org.slf4j:slf4j-api")
    implementation("org.slf4j:slf4j-simple")
    implementation(libs.kotlin.logging)

    testImplementation(platform(libs.kotest.bom))
    testImplementation("io.kotest:kotest-framework-api-jvm")
    testImplementation("io.kotest:kotest-assertions-core-jvm")
    testImplementation("io.kotest:kotest-framework-datatest")
    testImplementation("org.http4k:http4k-testing-kotest")
    testImplementation("org.http4k:http4k-connect-amazon-dynamodb-fake")
    testImplementation(libs.mockk)

    testRuntimeOnly("io.kotest:kotest-runner-junit5")
}

kotlin {
    jvmToolchain(17)
}

application {
    mainClass.set("de.obqo.causalist.app.MainKt")
}

tasks.shadowJar {
    // exclude specific env resources
    exclude(".env.*")
    // https://imperceptiblethoughts.com/shadow/configuration/minimizing/
    minimize {
        exclude(dependency("org.slf4j:slf4j-simple"))
    }
}

tasks.test {
    useJUnitPlatform()
}

testlogger {
    theme = ThemeType.MOCHA
}
