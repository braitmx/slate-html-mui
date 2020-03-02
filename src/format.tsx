import React, { FC } from "react"
import { Editor, Element as SlateElement } from "slate"
import { RenderElementProps, RenderLeafProps } from "slate-react"
import { TTagElement } from "./html"

export enum EHtmlMarkTag {
  "b" = "b",
  "strong" = "strong",
  "code" = "code",
  "em" = "em",
  "u" = "u",
}

export enum EHtmlBlockTag {
  "p" = "p",
  "h1" = "h1",
  "h2" = "h2",
  "h3" = "h3",
  "h4" = "h4",
  "h5" = "h5",
  "h6" = "h6",
  "blockquote" = "blockquote",
  "ol" = "ol",
  "ul" = "ul",
  "li" = "li",
}

export enum EHtmlListTag {
  "ol" = "ol",
  "ul" = "ul",
}

export const DEFAULT_TAG = EHtmlBlockTag.p

export const isHtmlBlockElement = (element: SlateElement | TTagElement) => {
  return element.tag in EHtmlBlockTag
}
export const HtmlBlockElement: FC<RenderElementProps> = ({ attributes, children, element }) => {
  return React.createElement((element as TTagElement).tag, attributes, children)
}
HtmlBlockElement.displayName = "HtmlBlockElement"

export const Leaf = ({ attributes, children, leaf }: RenderLeafProps) => {
  Object.keys(EHtmlMarkTag).forEach(tag => {
    if (leaf[tag]) {
      children = React.createElement(tag, {}, children)
    }
  })
  return <span {...attributes}>{children}</span>
}

export const isTagActive = (editor: Editor, tag: string) => {
  if (tag in EHtmlMarkTag) {
    const marks = Editor.marks(editor)
    return marks ? marks[tag] === true : false
  }

  if (tag in EHtmlBlockTag) {
    return isTagBlockActive(editor, tag)
  }

  return false
}

export const isTagBlockActive = (editor: Editor, tag: string) => {
  const [match] = Editor.nodes(editor, {
    match: n => n.tag === tag,
  })

  return !!match
}
