export interface BaseEmailProps {
  title: string;
  badgeText?: string;
  bodyContent: string;
  ctaButton?: {
    text: string;
    url: string;
  };
  securityNotice?: string;
  requestDetails?: Array<{ label: string; value: string }>;
}

export function renderT2TEmailLayout({
  title,
  badgeText = "TRASH2TREASURE SECURITY",
  bodyContent,
  ctaButton,
  securityNotice,
  requestDetails,
}: BaseEmailProps): string {
  const currentYear = new Date().getFullYear();

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #050507; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased; color: #FFFFFF;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #050507; width: 100%; padding: 40px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width: 540px; background-color: #0A0A0C; border: 1px solid #222226; border-radius: 16px; overflow: hidden; box-shadow: 0 20px 40px rgba(0,0,0,0.6);">
          
          <!-- Top Ambient Brand Line -->
          <tr>
            <td style="height: 3px; background: linear-gradient(90deg, #4F772D 0%, #14EF10 50%, #059669 100%);"></td>
          </tr>

          <!-- Header -->
          <tr>
            <td style="padding: 32px 32px 20px 32px; text-align: center;">
              ${
                badgeText
                  ? `<div style="display: inline-block; padding: 6px 14px; background-color: rgba(20, 239, 16, 0.08); border: 1px solid rgba(20, 239, 16, 0.25); border-radius: 9999px; margin-bottom: 16px;">
                      <span style="color: #14EF10; font-size: 11px; font-weight: 700; letter-spacing: 0.8px; text-transform: uppercase;">${badgeText}</span>
                    </div>`
                  : ""
              }
              <h1 style="color: #FFFFFF; font-size: 24px; font-weight: 800; margin: 0; letter-spacing: -0.5px;">${title}</h1>
            </td>
          </tr>

          <!-- Main Content -->
          <tr>
            <td style="padding: 0 32px 28px 32px;">
              <div style="background-color: #121216; border: 1px solid #222226; border-radius: 12px; padding: 24px; color: #CCCCCC; font-size: 14px; line-height: 1.6;">
                ${bodyContent}

                ${
                  ctaButton
                    ? `<div style="text-align: center; margin: 28px 0 12px 0;">
                        <a href="${ctaButton.url}" style="background-color: #14EF10; color: #000000; font-weight: 800; text-decoration: none; padding: 14px 32px; border-radius: 10px; display: inline-block; font-size: 14px; letter-spacing: 0.2px; text-transform: uppercase; box-shadow: 0 0 20px rgba(20, 239, 16, 0.35);">
                          ${ctaButton.text}
                        </a>
                      </div>`
                    : ""
                }
              </div>
            </td>
          </tr>

          <!-- Request Details / Context Table if provided -->
          ${
            requestDetails && requestDetails.length > 0
              ? `<tr>
                  <td style="padding: 0 32px 24px 32px;">
                    <div style="background-color: #0E0E12; border: 1px solid #1A1A20; border-radius: 10px; padding: 16px; font-size: 12px; color: #888888;">
                      <div style="font-weight: 700; color: #AAAAAA; margin-bottom: 8px; text-transform: uppercase; letter-spacing: 0.5px;">Activity Context</div>
                      ${requestDetails
                        .map(
                          (item) => `
                        <div style="display: flex; justify-content: space-between; padding: 4px 0; border-bottom: 1px solid #16161B;">
                          <span style="color: #777777;">${item.label}:</span>
                          <span style="color: #CCCCCC; font-weight: 600;">${item.value}</span>
                        </div>
                      `
                        )
                        .join("")}
                    </div>
                  </td>
                </tr>`
              : ""
          }

          <!-- Security Notice if provided -->
          ${
            securityNotice
              ? `<tr>
                  <td style="padding: 0 32px 24px 32px;">
                    <div style="background-color: rgba(234, 179, 8, 0.08); border: 1px solid rgba(234, 179, 8, 0.25); border-radius: 10px; padding: 14px 16px; font-size: 12px; color: #EAB308; line-height: 1.5;">
                      <strong>⚠️ Security Notice:</strong> ${securityNotice}
                    </div>
                  </td>
                </tr>`
              : ""
          }

          <!-- Footer -->
          <tr>
            <td style="padding: 24px 32px 32px 32px; border-top: 1px solid #1F1F24; text-align: center; background-color: #08080A;">
              <p style="color: #14EF10; font-weight: 700; font-size: 13px; margin: 0 0 6px 0;">Trash2Treasure Ecosystem</p>
              <p style="color: #666666; font-size: 11px; margin: 0 0 8px 0; line-height: 1.5;">
                Sustainable Waste Management & Eco-Reward Network<br />
                Primary Portal: <a href="https://trash2treasure.co.in" style="color: #14EF10; text-decoration: none;">trash2treasure.co.in</a> • Admin: <a href="https://admin.trash2treasure.co.in" style="color: #14EF10; text-decoration: none;">admin.trash2treasure.co.in</a>
              </p>
              <p style="color: #444444; font-size: 10px; margin: 0;">
                © ${currentYear} Trash2Treasure Innovation LLP. All rights reserved. • Confidential & Operational Dispatch
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}
