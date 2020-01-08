import escapeHtml from "escape-html"
import { Descendant, Element as SlateElement, Text } from "slate"
import { EHtmlBlockTag, EHtmlMarkTag, EHtmlVoidTag } from "./format"
import { isHtmlAnchorElement, LINK_TAG } from "./link"

type TAttributes = Record<string, any> | null
export type TTagElement = {
  tag: string
  children?: (TTagElement | Text)[]
  [key: string]: any
}

const attributes2String = (attributes: TAttributes): string => {
  if (!attributes) {
    return ""
  }
  const attributesString = Object.entries(attributes)
    .filter(([_k, v]) => v !== undefined && v !== null)
    .map(([k, v]) => {
      return `${k}="${String(v)}"`
    })
    .join(" ")
  return attributesString.length > 0 ? " " + attributesString : ""
}

const formatToString = (tag: string, attributes: TAttributes, children: string) => {
  return `<${tag}${attributes2String(attributes)}>${children}</${tag}>`
}
const formatVoidToString = (tag: string, attributes: TAttributes) => {
  return `<${tag}${attributes2String(attributes)}/>`
}

export const serialize = (node: TTagElement | TTagElement[] | Text | Text[] | Node[]): string => {
  if (Text.isText(node)) {
    const markTag = Object.entries(node).find(([k, v]) => k in EHtmlMarkTag && v === true)
    let text
    if (markTag && markTag[0]) {
      text = formatToString(markTag[0], null, escapeHtml(node.text))
    } else {
      text = escapeHtml(node.text)
    }
    return text.split("\n").join("<br/>")
  }

  if (Array.isArray(node)) {
    return (node as (TTagElement | Text)[]).map(serialize).join("")
  }

  const children = node.children && node.children.map(serialize).join("")
  if (children === undefined) {
    return ""
  }
  if (node.tag in EHtmlBlockTag) {
    return formatToString(node.tag, null, children)
  }

  if (isHtmlAnchorElement(node)) {
    const attributes = {
      ...node.attributes,
      href: node.attributes.href ? escapeHtml(node.attributes.href || "") : null,
    }
    return formatToString(node.tag, attributes, children)
  }

  if (node.tag in EHtmlVoidTag) {
    return formatVoidToString(node.tag, null)
  }

  return children
}

const deserializeChildNodes = (nodes: NodeListOf<ChildNode>) =>
  Array.from(nodes)
    .map(deserialize)
    .flat()

export const deserialize = (
  el: Element | ChildNode
): SlateElement | Text | string | null | Descendant[] | TTagElement => {
  if (el.nodeType === 3) {
    return { text: el.textContent || "" }
  }
  if (el.nodeType !== 1) {
    return null
  }

  if (el.nodeName === "BODY") {
    return deserializeChildNodes(el.childNodes)
  }

  const children = deserializeChildNodes(el.childNodes)

  const tag = el.nodeName.toLowerCase()
  const attributes = Array.from((el as Element).attributes).reduce<Record<string, string>>(
    (prev, attr) => {
      const name = attr.name === "class" ? "className" : attr.name
      prev[name] = attr.value
      return prev
    },
    {}
  )

  if (tag in EHtmlBlockTag || tag === LINK_TAG) {
    if (children.length === 0) {
      children.push({ text: "" } as Text)
    }
    return { tag, attributes, children }
  }

  if (tag in EHtmlMarkTag) {
    return children.map(child => {
      const text = typeof child === "string" ? child : child.text
      return { [tag]: true, attributes, text }
    })
  }

  if (tag === EHtmlVoidTag.br) {
    return { text: "\n" }
  }

  if (tag in EHtmlVoidTag) {
    return {
      tag,
      attributes,
      children: [{ text: "" }],
    }
  }

  return children
}
