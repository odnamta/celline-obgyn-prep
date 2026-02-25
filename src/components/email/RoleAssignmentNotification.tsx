import {
  Html,
  Head,
  Body,
  Container,
  Section,
  Text,
  Button,
  Link,
  Hr,
  Preview,
} from '@react-email/components'

interface RoleAssignmentNotificationProps {
  orgName: string
  employeeName: string
  roleName: string
  message: string
  actionUrl: string
  unsubscribeUrl: string
}

export default function RoleAssignmentNotification({
  orgName,
  employeeName,
  roleName,
  message,
  actionUrl,
  unsubscribeUrl,
}: RoleAssignmentNotificationProps) {
  return (
    <Html lang="id">
      <Head />
      <Preview>
        Anda ditugaskan ke role {roleName} — {orgName}
      </Preview>
      <Body style={body}>
        <Container style={container}>
          <Section style={header}>
            <Text style={headerBrand}>Cekatan</Text>
            <Text style={headerOrg}>{orgName}</Text>
          </Section>

          <Hr style={divider} />

          <Section style={content}>
            <Text style={greeting}>Halo {employeeName},</Text>
            <Text style={title}>Role Baru: {roleName}</Text>
            <Text style={messageText}>{message}</Text>

            <Section style={buttonContainer}>
              <Button style={actionButton} href={actionUrl}>
                Lihat Role & Skill
              </Button>
            </Section>
          </Section>

          <Hr style={divider} />

          <Section style={footer}>
            <Text style={footerText}>
              Email ini dikirim oleh Cekatan atas nama {orgName}.
            </Text>
            <Link href={unsubscribeUrl} style={unsubscribeLink}>
              Berhenti berlangganan
            </Link>
          </Section>
        </Container>
      </Body>
    </Html>
  )
}

const body: React.CSSProperties = {
  backgroundColor: '#f8fafc',
  fontFamily:
    '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
  margin: 0,
  padding: 0,
}

const container: React.CSSProperties = {
  maxWidth: '600px',
  margin: '0 auto',
  backgroundColor: '#ffffff',
  borderRadius: '8px',
  overflow: 'hidden',
  marginTop: '40px',
  marginBottom: '40px',
  border: '1px solid #e2e8f0',
}

const header: React.CSSProperties = {
  backgroundColor: '#1e40af',
  padding: '24px 32px',
}

const headerBrand: React.CSSProperties = {
  color: '#ffffff',
  fontSize: '24px',
  fontWeight: '700',
  margin: '0 0 4px 0',
  letterSpacing: '-0.5px',
}

const headerOrg: React.CSSProperties = {
  color: '#bfdbfe',
  fontSize: '14px',
  fontWeight: '400',
  margin: '0',
}

const divider: React.CSSProperties = {
  borderColor: '#e2e8f0',
  margin: '0',
}

const content: React.CSSProperties = {
  padding: '32px',
}

const greeting: React.CSSProperties = {
  fontSize: '15px',
  color: '#475569',
  margin: '0 0 8px 0',
}

const title: React.CSSProperties = {
  fontSize: '20px',
  fontWeight: '600',
  color: '#1e293b',
  margin: '0 0 16px 0',
}

const messageText: React.CSSProperties = {
  fontSize: '15px',
  lineHeight: '24px',
  color: '#475569',
  margin: '0 0 24px 0',
}

const buttonContainer: React.CSSProperties = {
  textAlign: 'center' as const,
  margin: '24px 0',
}

const actionButton: React.CSSProperties = {
  backgroundColor: '#2563eb',
  color: '#ffffff',
  fontSize: '15px',
  fontWeight: '600',
  padding: '12px 32px',
  borderRadius: '6px',
  textDecoration: 'none',
  display: 'inline-block',
}

const footer: React.CSSProperties = {
  padding: '24px 32px',
  backgroundColor: '#f8fafc',
}

const footerText: React.CSSProperties = {
  fontSize: '12px',
  color: '#94a3b8',
  margin: '0 0 8px 0',
}

const unsubscribeLink: React.CSSProperties = {
  fontSize: '12px',
  color: '#94a3b8',
  textDecoration: 'underline',
}
