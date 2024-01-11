import com.adarshr.gradle.testlogger.theme.ThemeType

plugins {
    kotlin("jvm") version "1.9.22"
    id("com.google.devtools.ksp") version "1.9.22-1.0.16"
    id("com.github.johnrengelman.shadow") version "8.1.1"
    id("com.adarshr.test-logger") version "4.0.0"
    id("de.obqo.decycle") version "1.1.0"
    application
}

group = "de.obqo.causalist"
version = "1.0-SNAPSHOT"

repositories {
    mavenCentral()
}

dependencies {
    implementation(kotlin("stdlib"))

    implementation(platform("org.http4k:http4k-bom:5.12.0.0"))
    implementation("org.http4k:http4k-core")
    implementation("org.http4k:http4k-contract")
    implementation("org.http4k:http4k-multipart")
    implementation("org.http4k:http4k-format-moshi") {
        exclude("org.jetbrains.kotlin", "kotlin-reflect")
    }
    implementation("org.http4k:http4k-serverless-lambda")

    implementation(platform("org.http4k:http4k-connect-bom:5.6.4.0"))
    implementation("org.http4k:http4k-connect-amazon-dynamodb")

    val kotshiVersion = "2.15.0"
    implementation("se.ansman.kotshi:api:$kotshiVersion")
    ksp("se.ansman.kotshi:compiler:$kotshiVersion")
    implementation("com.github.joniles:rtfparserkit:1.16.0")

    implementation(platform("org.slf4j:slf4j-bom:2.0.10"))
    implementation("org.slf4j:slf4j-api")
    implementation("org.slf4j:slf4j-simple")
    implementation("io.github.oshai:kotlin-logging-jvm:6.0.1")

    testImplementation(platform("io.kotest:kotest-bom:5.8.0"))
    testImplementation("io.kotest:kotest-framework-api-jvm")
    testImplementation("io.kotest:kotest-assertions-core-jvm")
    testImplementation("io.kotest:kotest-framework-datatest")
//    testImplementation("io.kotest:kotest-extensions-jvm")
//    testImplementation("io.kotest:kotest-property")
//    testImplementation("io.kotest:kotest-assertions-json")
    testImplementation("io.mockk:mockk:1.13.8")
    testRuntimeOnly("io.kotest:kotest-runner-junit5")

//    testImplementation("org.http4k:http4k-testing-approval")
//    testImplementation("org.http4k:http4k-testing-hamkrest")
//    testImplementation("org.http4k:http4k-testing-kotest")
    testImplementation("org.http4k:http4k-connect-amazon-dynamodb-fake")
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
