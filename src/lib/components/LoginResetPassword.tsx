
import { memo } from "react";
import { Template } from "./Template";
import type { KcProps } from "./KcProps";
import { assert } from "../tools/assert";
import { kcContext } from "../kcContext";
import { useKcMessage } from "../i18n/useKcMessage";
import { cx } from "tss-react";

export const LoginResetPassword = memo((props: KcProps) => {

    const { msg, msgStr } = useKcMessage();

    assert(
        kcContext !== undefined &&
        kcContext.pageId === "login-reset-password.ftl"
    );

    const {
        url,
        realm,
        auth
    } = kcContext;

    return (
        <Template
            {...props}
            displayMessage={false}
            headerNode={msg("emailForgotTitle")}
            formNode={
                <form id="kc-reset-password-form" className={cx(props.kcFormClass)} action={url.loginAction} method="post">
                    <div className={cx(props.kcFormGroupClass)}>
                        <div className={cx(props.kcLabelWrapperClass)}>
                            <label htmlFor="username" className={cx(props.kcLabelClass)}>
                                {
                                    !realm.loginWithEmailAllowed ?
                                        msg("username")
                                        :
                                        !realm.registrationEmailAsUsername ?
                                            msg("usernameOrEmail") :
                                            msg("email")
                                }
                            </label>
                        </div>
                        <div className={cx(props.kcInputWrapperClass)}>
                            <input
                                type="text"
                                id="username"
                                name="username"
                                className={cx(props.kcInputClass)}
                                autoFocus
                                defaultValue={
                                    auth !== undefined && auth.showUsername ?
                                        auth.attemptedUsername : undefined
                                }
                            />
                        </div>
                    </div>
                    <div className={cx(props.kcFormGroupClass, props.kcFormSettingClass)}>
                        <div id="kc-form-options" className={cx(props.kcFormOptionsClass)}>
                            <div className={cx(props.kcFormOptionsWrapperClass)}>
                                <span>
                                    <a href={url.loginUrl}>{msg("backToLogin")}</a>
                                </span>
                            </div>
                        </div>

                        <div id="kc-form-buttons" className={cx(props.kcFormButtonsClass)}>
                            <input
                                className={cx(
                                    props.kcButtonClass, props.kcButtonPrimaryClass,
                                    props.kcButtonBlockClass, props.kcButtonLargeClass
                                )}
                                type="submit"
                                defaultValue={msgStr("doSubmit")}
                            />
                        </div>
                    </div>
                </form>
            }
            infoNode={msg("emailInstruction")}
        />
    );
});


