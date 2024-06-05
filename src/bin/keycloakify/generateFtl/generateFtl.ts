import cheerio from "cheerio";
import { replaceImportsInJsCode } from "../replacers/replaceImportsInJsCode";
import { generateCssCodeToDefineGlobals } from "../replacers/replaceImportsInCssCode";
import { replaceImportsInInlineCssCode } from "../replacers/replaceImportsInInlineCssCode";
import * as fs from "fs";
import { join as pathJoin } from "path";
import type { BuildOptions } from "../../shared/buildOptions";
import { assert } from "tsafe/assert";
import {
    type ThemeType,
    nameOfTheGlobal,
    basenameOfTheKeycloakifyResourcesDir,
    resources_common,
    nameOfTheLocalizationRealmOverridesUserProfileProperty
} from "../../shared/constants";
import { getThisCodebaseRootDirPath } from "../../tools/getThisCodebaseRootDirPath";

export type BuildOptionsLike = {
    bundler: "vite" | "webpack";
    themeVersion: string;
    urlPathname: string | undefined;
    reactAppBuildDirPath: string;
    assetsDirPath: string;
    kcContextExclusionsFtlCode: string | undefined;
};

assert<BuildOptions extends BuildOptionsLike ? true : false>();

export function generateFtlFilesCodeFactory(params: {
    themeName: string;
    indexHtmlCode: string;
    cssGlobalsToDefine: Record<string, string>;
    buildOptions: BuildOptionsLike;
    keycloakifyVersion: string;
    themeType: ThemeType;
    fieldNames: string[];
}) {
    const {
        themeName,
        cssGlobalsToDefine,
        indexHtmlCode,
        buildOptions,
        keycloakifyVersion,
        themeType,
        fieldNames
    } = params;

    const $ = cheerio.load(indexHtmlCode);

    fix_imports_statements: {
        $("script:not([src])").each((...[, element]) => {
            const jsCode = $(element).html();

            assert(jsCode !== null);

            const { fixedJsCode } = replaceImportsInJsCode({
                jsCode,
                buildOptions
            });

            $(element).text(fixedJsCode);
        });

        $("style").each((...[, element]) => {
            const cssCode = $(element).html();

            assert(cssCode !== null);

            const { fixedCssCode } = replaceImportsInInlineCssCode({
                cssCode,
                buildOptions
            });

            $(element).text(fixedCssCode);
        });

        (
            [
                ["link", "href"],
                ["script", "src"]
            ] as const
        ).forEach(([selector, attrName]) =>
            $(selector).each((...[, element]) => {
                const href = $(element).attr(attrName);

                if (href === undefined) {
                    return;
                }

                $(element).attr(
                    attrName,
                    href.replace(
                        new RegExp(
                            `^${(buildOptions.urlPathname ?? "/").replace(/\//g, "\\/")}`
                        ),
                        `\${url.resourcesPath}/${basenameOfTheKeycloakifyResourcesDir}/`
                    )
                );
            })
        );

        if (Object.keys(cssGlobalsToDefine).length !== 0) {
            $("head").prepend(
                [
                    "",
                    "<style>",
                    generateCssCodeToDefineGlobals({
                        cssGlobalsToDefine,
                        buildOptions
                    }).cssCodeToPrependInHead,
                    "</style>",
                    ""
                ].join("\n")
            );
        }
    }

    //FTL is no valid html, we can't insert with cheerio, we put placeholder for injecting later.
    const ftlObjectToJsCodeDeclaringAnObject = fs
        .readFileSync(
            pathJoin(
                getThisCodebaseRootDirPath(),
                "src",
                "bin",
                "keycloakify",
                "generateFtl",
                "ftl_object_to_js_code_declaring_an_object.ftl"
            )
        )
        .toString("utf8")
        .match(/^<script>const _=((?:.|\n)+)<\/script>[\n]?$/)![1]
        .replace(
            "FIELD_NAMES_eKsIY4ZsZ4xeM",
            fieldNames.map(name => `"${name}"`).join(", ")
        )
        .replace("KEYCLOAKIFY_VERSION_xEdKd3xEdr", keycloakifyVersion)
        .replace("KEYCLOAKIFY_THEME_VERSION_sIgKd3xEdr3dx", buildOptions.themeVersion)
        .replace("KEYCLOAKIFY_THEME_TYPE_dExKd3xEdr", themeType)
        .replace("KEYCLOAKIFY_THEME_NAME_cXxKd3xEer", themeName)
        .replace("RESOURCES_COMMON_cLsLsMrtDkpVv", resources_common)
        .replace(
            "lOCALIZATION_REALM_OVERRIDES_USER_PROFILE_PROPERTY_KEY_aaGLsPgGIdeeX",
            nameOfTheLocalizationRealmOverridesUserProfileProperty
        )
        .replace(
            "USER_DEFINED_EXCLUSIONS_eKsaY4ZsZ4eMr2",
            buildOptions.kcContextExclusionsFtlCode ?? ""
        );
    const ftlObjectToJsCodeDeclaringAnObjectPlaceholder =
        '{ "x": "vIdLqMeOed9sdLdIdOxdK0d" }';

    $("head").prepend(
        `<script>\nwindow.${nameOfTheGlobal}=${ftlObjectToJsCodeDeclaringAnObjectPlaceholder}</script>`
    );

    // Remove part of the document marked as ignored.
    {
        const startTags = $('meta[name="keycloakify-ignore-start"]');

        startTags.each((...[, startTag]) => {
            const $startTag = $(startTag);
            const $endTag = $startTag
                .nextAll('meta[name="keycloakify-ignore-end"]')
                .first();

            if ($endTag.length) {
                let currentNode = $startTag.next();
                while (currentNode.length && !currentNode.is($endTag)) {
                    currentNode.remove();
                    currentNode = $startTag.next();
                }

                $startTag.remove();
                $endTag.remove();
            }
        });
    }

    const partiallyFixedIndexHtmlCode = $.html();

    function generateFtlFilesCode(params: { pageId: string }): {
        ftlCode: string;
    } {
        const { pageId } = params;

        const $ = cheerio.load(partiallyFixedIndexHtmlCode);

        let ftlCode = $.html();

        Object.entries({
            [ftlObjectToJsCodeDeclaringAnObjectPlaceholder]:
                ftlObjectToJsCodeDeclaringAnObject,
            PAGE_ID_xIgLsPgGId9D8e: pageId
        }).map(
            ([searchValue, replaceValue]) =>
                (ftlCode = ftlCode.replace(searchValue, replaceValue))
        );

        return { ftlCode };
    }

    return { generateFtlFilesCode };
}
