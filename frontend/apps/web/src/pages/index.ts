export { LoginPage } from './LoginPage/LoginPage';
export { SignupPage } from './SignupPage/SignupPage';
export { ForgotPasswordPage } from './ForgotPasswordPage/ForgotPasswordPage';
export { ResetPasswordPage } from './ResetPasswordPage/ResetPasswordPage';
export { CheckEmailPage } from './CheckEmailPage/CheckEmailPage';
export { VerifyEmailPage } from './VerifyEmailPage/VerifyEmailPage';
export { OAuthCallbackPage } from './OAuthCallbackPage/OAuthCallbackPage';
export { LinkAccountsPage } from './LinkAccountsPage/LinkAccountsPage';

export { DashboardPage } from './DashboardPage/DashboardPage';
export { ResultsPage } from './ResultsPage/ResultsPage';
export { SettingsPage } from './SettingsPage/SettingsPage';

export { PracticeSubjectPage } from './PracticeSubjectPage';
export { PracticeHomePage } from './PracticeHomePage';
export { PracticeDomainsPage } from './PracticeDomainsPage';
export { PracticeSkillsPage } from './PracticeSkillsPage';
export { PracticeConfirmPage } from './PracticeConfirmPage';
export { QuestionsPage } from './QuestionsPage';

/** Legacy session runner, superseded by QuestionsPage at /practice/session.
 *  Kept unrouted so the questions segment can port its logic across. */
export { PracticePage } from './PracticePage/PracticePage';
