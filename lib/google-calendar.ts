import { getToken } from '@vercel/connect'

export const GOOGLE_CONNECTOR = 'google/dl-dashboard-google-calendar'
const subject = { type: 'user' as const, id: 'dl-dashboard-owner' }

export async function getGoogleToken() {
  return getToken(GOOGLE_CONNECTOR, {
    subject,
    scopes: ['https://www.googleapis.com/auth/calendar.readonly'],
  })
}
