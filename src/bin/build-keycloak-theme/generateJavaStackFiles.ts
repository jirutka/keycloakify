
import * as url from "url";
import * as fs from "fs";
import { join as pathJoin, dirname as pathDirname } from "path";

export type ParsedPackageJson = {
    name: string;
    version: string;
    homepage?: string;
};

export function generateJavaStackFiles(
    params: {
        parsedPackageJson: ParsedPackageJson;
        keycloakThemeBuildingDirPath: string;
    }
): { jarFilePath: string; } {

    const {
        parsedPackageJson: { name, version, homepage },
        keycloakThemeBuildingDirPath
    } = params;

    {

        const { pomFileCode } = (function generatePomFileCode(): { pomFileCode: string; } {


            const groupId = (() => {

                const fallbackGroupId = `there.was.no.homepage.field.in.the.package.json.${name}`;

                return (!homepage ?
                    fallbackGroupId :
                    url.parse(homepage).host?.split(".").reverse().join(".") ?? fallbackGroupId
                ) + ".keycloak";

            })();

            const artefactId = `${name}-keycloak-theme`;

            const pomFileCode = [
                `<?xml version="1.0"?>`,
                `<project xmlns="http://maven.apache.org/POM/4.0.0"`,
                `	xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"`,
                `	xsi:schemaLocation="http://maven.apache.org/POM/4.0.0 http://maven.apache.org/maven-v4_0_0.xsd">`,
                `	<modelVersion>4.0.0</modelVersion>`,
                `	<groupId>${groupId}</groupId>`,
                `	<artifactId>${artefactId}</artifactId>`,
                `	<version>${version}</version>`,
                `	<name>${artefactId}</name>`,
                `	<description />`,
                `</project>`
            ].join("\n");

            return { pomFileCode };

        })();

        fs.writeFileSync(
            pathJoin(keycloakThemeBuildingDirPath, "pom.xml"),
            Buffer.from(pomFileCode, "utf8")
        );

    }

    {

        const themeManifestFilePath = pathJoin(
            keycloakThemeBuildingDirPath, "src", "main",
            "resources", "META-INF", "keycloak-themes.json"
        );

        try {

            fs.mkdirSync(pathDirname(themeManifestFilePath));

        } catch { }

        fs.writeFileSync(
            themeManifestFilePath,
            Buffer.from(
                JSON.stringify({
                    "themes": [
                        {
                            "name": name,
                            "types": ["login"]
                        }
                    ]
                }, null, 2),
                "utf8"
            )
        );

    }

    return { "jarFilePath": pathJoin(keycloakThemeBuildingDirPath, "target", `${name}-${version}.jar`) };

}

