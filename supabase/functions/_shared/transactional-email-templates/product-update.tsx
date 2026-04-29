/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'
import {
  Body,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Preview,
  Section,
  Text,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = 'ModelBook'

interface ChangelogItem {
  category: 'new' | 'improved' | 'fixed'
  title: string
  body?: string
}

interface ProductUpdateProps {
  intro?: string
  items?: ChangelogItem[]
  periodLabel?: string
}

const CATEGORY_META: Record<ChangelogItem['category'], { label: string; emoji: string }> = {
  new: { label: 'New', emoji: '✨' },
  improved: { label: 'Improved', emoji: '🛠' },
  fixed: { label: 'Fixed', emoji: '🐛' },
}

const ProductUpdateEmail = ({
  intro,
  items = [],
  periodLabel,
}: ProductUpdateProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>What's new in {SITE_NAME}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={brand}>ModelBook</Heading>
        <Heading style={h1}>What's new{periodLabel ? ` · ${periodLabel}` : ''}</Heading>

        {intro ? (
          intro
            .replace(/\r\n/g, '\n')
            .split(/\n{2,}/)
            .map((para, pIdx) => {
              const lines = para.split('\n')
              return (
                <Text key={pIdx} style={text}>
                  {lines.map((line, lIdx) => (
                    <React.Fragment key={lIdx}>
                      {line}
                      {lIdx < lines.length - 1 ? <br /> : null}
                    </React.Fragment>
                  ))}
                </Text>
              )
            })
        ) : (
          <Text style={text}>
            A quick recap of the latest updates we've shipped in {SITE_NAME}.
          </Text>
        )}

        <Hr style={hr} />

        {items.length === 0 ? (
          <Text style={text}>No updates to share this time.</Text>
        ) : (
          items.map((item, idx) => {
            const meta = CATEGORY_META[item.category] || CATEGORY_META.new
            return (
              <Section key={idx} style={itemSection}>
                <Text style={tag}>
                  {meta.emoji} {meta.label}
                </Text>
                <Text style={itemTitle}>{item.title}</Text>
                {item.body
                  ? item.body
                      .replace(/\r\n/g, '\n')
                      .split(/\n{2,}/)
                      .map((para, pIdx) => {
                        const lines = para.split('\n')
                        return (
                          <Text key={pIdx} style={itemBody}>
                            {lines.map((line, lIdx) => (
                              <React.Fragment key={lIdx}>
                                {line}
                                {lIdx < lines.length - 1 ? <br /> : null}
                              </React.Fragment>
                            ))}
                          </Text>
                        )
                      })
                  : null}
              </Section>
            )
          })
        )}

        <Hr style={hr} />

        <Text style={footer}>
          Thanks for being part of the {SITE_NAME} beta. Reply with feedback
          anytime — we read every message.
        </Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: ProductUpdateEmail,
  subject: (data: Record<string, any>) =>
    data?.periodLabel
      ? `What's new in ${SITE_NAME} · ${data.periodLabel}`
      : `What's new in ${SITE_NAME}`,
  displayName: 'Product update digest',
  previewData: {
    periodLabel: 'April 2026',
    intro: "Here's what we shipped this month:",
    items: [
      { category: 'new', title: 'Multi-currency support', body: 'Save jobs in any currency and see them auto-converted.' },
      { category: 'improved', title: 'Faster dashboard load', body: 'Charts now render in under a second.' },
      { category: 'fixed', title: 'Date filter edge case', body: 'Period filters now include the last day correctly.' },
    ],
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: "'DM Sans', Arial, sans-serif" }
const container = { padding: '32px 28px', maxWidth: '560px' }
const brand = {
  fontFamily: "'Playfair Display', Georgia, serif",
  fontSize: '28px',
  fontWeight: '600' as const,
  color: '#d4a73a',
  margin: '0 0 24px',
  letterSpacing: '0.5px',
}
const h1 = {
  fontFamily: "'Playfair Display', Georgia, serif",
  fontSize: '24px',
  fontWeight: '600' as const,
  color: '#1a1a1a',
  margin: '0 0 16px',
}
const text = {
  fontSize: '15px',
  color: '#4a4a4a',
  lineHeight: '1.6',
  margin: '0 0 16px',
}
const hr = { borderColor: '#eeeeee', margin: '24px 0' }
const itemSection = { margin: '0 0 20px' }
const tag = {
  fontSize: '11px',
  color: '#d4a73a',
  fontWeight: '600' as const,
  letterSpacing: '0.6px',
  textTransform: 'uppercase' as const,
  margin: '0 0 4px',
}
const itemTitle = {
  fontSize: '16px',
  color: '#1a1a1a',
  fontWeight: '600' as const,
  margin: '0 0 4px',
  lineHeight: '1.4',
}
const itemBody = {
  fontSize: '14px',
  color: '#55575d',
  lineHeight: '1.6',
  margin: '0',
}
const footer = { fontSize: '12px', color: '#999999', margin: '24px 0 0', lineHeight: '1.5' }
