import com.adarshr.gradle.testlogger.theme.ThemeType

plugins {
    kotlin("jvm") version "2.2.10"
    alias(libs.plugins.ksp)
    alias(libs.plugins.shadow)
    alias(libs.plugins.test.logger)
    alias(libs.plugins.kotest)
    alias(libs.plugins.kover)
    alias(libs.plugins.decycle)
    alias(libs.plugins.dependency.check)
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
    implementation("org.http4k:http4k-api-openapi")
    implementation("org.http4k:http4k-ops-failsafe")
    implementation("org.http4k:http4k-multipart")
    implementation("org.http4k:http4k-format-moshi") {
        exclude("org.jetbrains.kotlin", "kotlin-reflect")
    }
    implementation("org.http4k:http4k-serverless-lambda")
    implementation("org.http4k:http4k-connect-amazon-containercredentials")
    implementation("org.http4k:http4k-connect-amazon-dynamodb")
    implementation("org.http4k:http4k-connect-amazon-s3")

    implementation(libs.kotshi.api)
    ksp(libs.kotshi.compiler)
    implementation(libs.rtfparserkit)

    implementation(platform(libs.slf4j.bom))
    implementation("org.slf4j:slf4j-api")
    implementation("org.slf4j:slf4j-simple")
    implementation(libs.kotlin.logging)

    implementation(libs.crac)

    testImplementation(platform(libs.kotest.bom))
    testImplementation("io.kotest:kotest-assertions-core-jvm")
    testImplementation("io.kotest:kotest-framework-engine")
    testImplementation("org.http4k:http4k-testing-kotest")
    testImplementation("org.http4k:http4k-connect-amazon-dynamodb-fake")
    testImplementation("org.http4k:http4k-connect-amazon-s3-fake")
    testImplementation(libs.mockk)

    testRuntimeOnly("io.kotest:kotest-runner-junit5")
}

kotlin {
    jvmToolchain(21)
    compilerOptions {
        allWarningsAsErrors.set(true)
    }
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

// https://kotlin.github.io/kotlinx-kover/gradle-plugin/#configuring-report-tasks
kover {
    reports {
        total {
            filters {
                excludes {
                    classes("de.obqo.causalist.api.Kotshi*") // generated
                }
            }
            html {
                onCheck = true
            }
        }
    }
}
