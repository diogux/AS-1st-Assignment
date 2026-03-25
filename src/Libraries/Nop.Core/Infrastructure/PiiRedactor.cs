using System.Text.RegularExpressions;

namespace Nop.Core.Infrastructure;

/// <summary>
/// Utility class for redacting Personally Identifiable Information (PII) from traces and metrics
/// </summary>
public static class PiiRedactor
{
    private static readonly Regex EmailRegex = new(@"\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b", RegexOptions.Compiled);

    /// <summary>
    /// Redacts email addresses from the input string
    /// </summary>
    /// <param name="input">Input string that may contain PII</param>
    /// <returns>String with email addresses redacted</returns>
    public static string RedactEmails(string input)
    {
        if (string.IsNullOrEmpty(input))
            return input;

        return EmailRegex.Replace(input, "[EMAIL_REDACTED]");
    }
}
