import { describe, expect, it } from 'vitest'
import { isAllowedExternalUrl } from './externalUrls'

describe('isAllowedExternalUrl', () => {
  it('allows Google documents and GitHub over https', () => {
    expect(isAllowedExternalUrl('https://docs.google.com/document/d/abc/edit')).toBe(true)
    expect(isAllowedExternalUrl('https://github.com/extrasnow75-bit/blueprint-tools-script')).toBe(true)
  })
  it('refuses other sites, plain http and local files', () => {
    expect(isAllowedExternalUrl('https://example.com/')).toBe(false)
    expect(isAllowedExternalUrl('http://docs.google.com/document/d/abc')).toBe(false)
    expect(isAllowedExternalUrl('file:///C:/Windows/system32/calc.exe')).toBe(false)
    expect(isAllowedExternalUrl('not a url')).toBe(false)
  })
})
