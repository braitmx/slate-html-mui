import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  MenuItem,
  TextField,
} from "@material-ui/core"
import Link from "@material-ui/icons/Link"
import escapeHtml from "escape-html"
import isUrl from "is-url"
import React, { AnchorHTMLAttributes, FC, useState } from "react"
import { Editor, Element as SlateElement, Node, Path, Range, Text, Transforms } from "slate"
import { RenderElementProps, useSlate } from "slate-react"
import { TSlateTypeElement } from "./html"
import { TSlatePlugin } from "../pen/plugin"
import { ToolbarButton, TToolbarButtonProps } from "./toolbar-button"
import { formatTagToString, getAttributes } from "../pen/util"

export const LINK_TAG = "a"

export type TAnchorAnyAttributes = AnchorHTMLAttributes<any> & Record<string, string>
type TSetLinkCommand = {
  attributes: TAnchorAnyAttributes
  text: string
  range: Range
}
export type THtmlLinkSlateElement = TSlateTypeElement & {
  text: Text["text"]
  attributes: TAnchorAnyAttributes
}

type TLinkSelection = {
  range: Range | null
  isExpanded: boolean
  link: THtmlLinkSlateElement | null
  text: string
}
type TLinkButtonState = {
  open: boolean
  attributes: TAnchorAnyAttributes
} & TLinkSelection

type TLinkButtonStateInitial = Omit<TLinkButtonState, "open">

const defaults: TLinkButtonState = {
  open: false,
  range: null,
  isExpanded: false,
  link: null,
  text: "",
  attributes: {},
}

const match = (node: Node): boolean => (node as TSlateTypeElement).type === LINK_TAG

const isLinkActive = (editor: Editor) => {
  return !!findLink(editor)
}
const findLinkEntry = (editor: Editor): [THtmlLinkSlateElement, Path] => {
  const [linkEntry] = Editor.nodes(editor, { match })
  return linkEntry as [THtmlLinkSlateElement, Path]
}
const findLink = (editor: Editor): THtmlLinkSlateElement | null => {
  const linkEntry = findLinkEntry(editor)
  return linkEntry ? linkEntry[0] : null
}

const getInitialLinkData = (editor: Editor): TLinkButtonStateInitial => {
  const link = findLink(editor)

  const isExpanded = editor.selection ? Range.isExpanded(editor.selection) : false

  const text =
    editor.selection && isExpanded
      ? Editor.string(editor, editor.selection)
      : (link && Node.string(link)) || ""

  return {
    isExpanded,
    link,
    text,
    range: editor.selection ? { ...editor.selection } : null,
    attributes: link ? link.attributes : {},
  }
}

export const isHtmlAnchorElement = (element: any): element is THtmlLinkSlateElement => {
  return element.tag === LINK_TAG
}
const cleanAttributesMutate = (attributes: TAnchorAnyAttributes) =>
  Object.entries(attributes).forEach(([key, value]) => {
    return (value === null || value === undefined) && delete (attributes as any)[key]
  })
export const HtmlAnchorElement: FC<RenderElementProps> = ({ attributes, children, element }) => {
  const resultAttributes: TAnchorAnyAttributes = {
    ...attributes,
    ...element.attributes,
  }
  cleanAttributesMutate(resultAttributes)
  return React.createElement(LINK_TAG, resultAttributes, children)
}
HtmlAnchorElement.displayName = "HtmlAnchorElement"

type TLinkButtonProps = {
  LinkFormDialog?: FC<TLinkFormDialogProps>
} & Omit<TToolbarButtonProps, "tooltipTitle"> & { tooltipTitle?: string }
export const LinkButton: FC<TLinkButtonProps> = ({
  LinkFormDialog: _LinkFormDialog,
  children,
  ...rest
}) => {
  const editor = useSlate()
  const isActive = isLinkActive(editor)
  const [state, setState] = useState<TLinkButtonState>(defaults)
  const mergeState = (partState: Partial<TLinkButtonState>) => setState({ ...state, ...partState })

  const handleOpen = () => {
    const linkData = getInitialLinkData(editor)
    mergeState({ open: true, ...linkData })
  }

  const onRemove = () => {
    unwrapLink(editor)
    mergeState({ open: false })
  }

  const onOk = () => {
    const { text, attributes } = state
    cleanAttributesMutate(attributes)
    if (!state.range) {
      throw new Error("Invalid range. Must be typeof Range.")
    }
    const command: TSetLinkCommand = { attributes, text, range: state.range }
    wrapLink(editor, command)
    mergeState({ open: false })
  }

  const updateAttribute = (name: string, value: string) =>
    mergeState({ attributes: { ...state.attributes, [name]: value } })

  const LinkFormDialogComponent = _LinkFormDialog || LinkFormDialog
  return (
    <>
      <ToolbarButton
        tooltipTitle="Link"
        color={isActive ? "primary" : "default"}
        variant={isActive ? "contained" : "text"}
        onClick={handleOpen}
        {...rest}
      >
        {children || <Link />}
      </ToolbarButton>
      <LinkFormDialogComponent
        open={state.open}
        attributes={state.attributes}
        text={state.text}
        onOk={onOk}
        updateText={text => mergeState({ text })}
        updateAttribute={updateAttribute}
        onRemove={onRemove}
        onClose={() => mergeState({ open: false })}
      />
    </>
  )
}
LinkButton.displayName = "LinkButton"

const unwrapLink = (editor: Editor) => {
  Transforms.unwrapNodes(editor, { match })
}

const wrapLink = (editor: Editor, command: TSetLinkCommand): void => {
  const { range, attributes, text } = command
  const foundLinkEntry = findLinkEntry(editor)
  Transforms.setSelection(editor, range)
  const isCollapsed = range && Range.isCollapsed(range)

  const link: TSlateTypeElement = {
    type: LINK_TAG,
    attributes,
    children: [{ text }],
  }

  if (!foundLinkEntry && isCollapsed) {
    Transforms.insertNodes(editor, [link as SlateElement], { at: range })
  } else {
    if (isCollapsed) {
      const path = foundLinkEntry[1]
      Transforms.setNodes(editor, link, { at: path, split: true })
    } else {
      Transforms.wrapNodes(editor, link as SlateElement, { at: range, split: true })
    }
    Transforms.collapse(editor, { edge: "end" })
  }
}

export type TLinkFormDialogProps = {
  text: string
  attributes: TAnchorAnyAttributes
  open: boolean
  updateText: (text: string) => void
  updateAttribute: (name: keyof AnchorHTMLAttributes<any> | string, value: string) => void
  onClose: () => void
  onOk: () => void
  onRemove?: () => void
}
export const LinkFormDialog: FC<TLinkFormDialogProps> = ({
  open,
  text,
  attributes,
  updateText,
  updateAttribute,
  onRemove,
  onClose,
  onOk,
}) => {
  return (
    <Dialog open={open} onClose={onClose} aria-labelledby="link-form-dialog-title">
      <DialogTitle id="link-form-dialog-title">Insert/Edit Link</DialogTitle>
      <DialogContent>
        <TextField
          label="Text to display"
          value={text}
          onChange={e => updateText(e.target.value)}
          fullWidth
        />
        <TextField
          label="Attribute: title"
          value={attributes.title}
          onChange={e => updateAttribute("title", e.target.value)}
          fullWidth
        />
        <TextField
          label="Attribute: href"
          value={attributes.href}
          onChange={e => updateAttribute("href", e.target.value)}
          fullWidth
        />
        <TextField
          label="Attribute: target"
          value={attributes.target}
          onChange={e => updateAttribute("target", e.target.value)}
          select
          fullWidth
        >
          <MenuItem value="">_self (implicit)</MenuItem>
          <MenuItem value="_self">_self (explicit)</MenuItem>
          <MenuItem value="_blank">_blank</MenuItem>
          <MenuItem value="_parent">_parent</MenuItem>
          <MenuItem value="_top">_top</MenuItem>
        </TextField>
      </DialogContent>
      <DialogActions>
        {onRemove && (
          <Button onClick={onRemove} color="secondary">
            Remove link
          </Button>
        )}
        <Button onClick={onClose} color="primary">
          Cancel
        </Button>
        <Button onClick={onOk} color="primary">
          OK
        </Button>
      </DialogActions>
    </Dialog>
  )
}
LinkFormDialog.displayName = "LinkFormDialog"

export const createAnchorPlugin = (): TSlatePlugin => ({
  toHtml: (node, slatePen) => {
    if (isHtmlAnchorElement(node)) {
      const attributes = {
        ...node.attributes,
        href: node.attributes.href ? escapeHtml(node.attributes.href || "") : null,
      }
      const children = slatePen.nodeChildrenToHtml(node)
      return formatTagToString(node.type, attributes, children)
    }
    return null
  },
  fromHtmlElement: (el, slatePen) => {
    const tag = el.nodeName.toLowerCase()
    if (tag === LINK_TAG) {
      const attributes = getAttributes(el as Element)
      const children = slatePen.fromHtmlChildNodes(el.childNodes)
      if (children.length === 0) {
        children.push({ text: "" })
      }
      return { tag, attributes, children }
    }
    return null
  },
  extendEditor: editor => {
    const { insertData, insertText, isInline } = editor

    editor.isInline = element => {
      return (element as TSlateTypeElement).type === LINK_TAG ? true : isInline(element)
    }

    editor.insertText = text => {
      if (text && isUrl(text)) {
        wrapLink(editor, { attributes: { href: text }, range: editor.range, text })
      } else {
        insertText(text)
      }
    }

    editor.insertData = (data: DataTransfer) => {
      const text = data.getData("text/plain")

      if (text && isUrl(text)) {
        wrapLink(editor, { attributes: { href: text }, range: editor.range, text })
      } else {
        insertData(data)
      }
    }
  },
  RenderElement: props => {
    const element = props.element as TSlateTypeElement
    if (isHtmlAnchorElement(element)) {
      return <HtmlAnchorElement {...props} />
    }
    return null
  },
})