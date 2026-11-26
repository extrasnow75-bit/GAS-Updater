import { describe, expect, it } from 'vitest'
import { isAllowedExternalUrl } from './externalUrls'

describe('isAllowedExternalUrl', () => {
  it('allows Google documents, Google console pages and this project on GitHub', () => {
    expect(isAllowedExternalUrl('https://docs.google.com/document/d/abc/edit')).toBe(true)
    expect(isAllowedExternalUrl('https://console.developers.google.com/apis/api/script.googleapis.com')).toBe(true)
    expect(isAllowedExternalUrl('https://github.com/extrasnow75-bit/GAS-Updater/actions')).toBe(true)
    expect(isAllowedExternalUrl('https://docs.github.com/en/authentication')).toBe(true)
  })
  it('refuses other GitHub accounts, other sites, plain http and local files', () => {
    expect(isAllowedExternalUrl('https://github.com/someone-else/fake-installer/releases')).toBe(false)
    expect(isAllowedExternalUrl('https://example.com/')).toBe(false)
    expect(isAllowedExternalUrl('http://docs.google.com/document/d/abc')).toBe(false)
    expect(isAllowedExternalUrl('https://user@docs.google.com/document/d/abc')).toBe(false)
    expect(isAllowedExternalUrl('file:///C:/Windows/system32/calc.exe')).toBe(false)
    expect(isAllowedExternalUrl('not a url')).toBe(false)
  })
})
