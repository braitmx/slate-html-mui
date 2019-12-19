import { ButtonProps } from "@material-ui/core"
import Image from "@material-ui/icons/Image"
import React, { FC } from "react"
import { Editor, Node, Range } from "slate"
import { useSlate } from "slate-react"
import { ToolbarButton } from "./toolbar-button"

export const IMG_INLINE_TYPE = "a"
const match = (node: Node): boolean => node.type === IMG_INLINE_TYPE

const getImageData = (editor: Editor): TLinkAttributes & TLinkSelection => {
  const link = findImage(editor)

  const isExpanded = editor.selection ? Range.isExpanded(editor.selection) : false

  const text =
    editor.selection && isExpanded
      ? Editor.text(editor, editor.selection)
      : (link && Node.text(link)) || ""

  return {
    isExpanded,
    link,
    text,
    range: editor.selection,
    href: (link && link.attributes.href) || "",
    title: (link && link.attributes.title) || "",
    target: (link && link.attributes.target) || "",
  }
}

const isImgActive = (editor: Editor) => {
  return !!findImage(editor)
}
const findImageEntry = (editor: Editor): [THtmlLinkSlateElement, Path] => {
  const [linkEntry] = Editor.nodes(editor, { match })
  return linkEntry as [THtmlLinkSlateElement, Path]
}
const findImage = (editor: Editor): THtmlLinkSlateElement | null => {
  const linkEntry = findImageEntry(editor)
  return linkEntry ? linkEntry[0] : null
}

type TLinkButtonProps = {} & ButtonProps
export const LinkButton: FC<TLinkButtonProps> = ({ ...rest }) => {
  const editor = useSlate()
  const isActive = isImgActive(editor)
  // const [state, setState] = useState<TLinkButtonState>(defaults)
  // const mergeState = (partState: Partial<TLinkButtonState>) => setState({ ...state, ...partState })

  const handleOpen = () => {
    const linkData = getImageData(editor)
    mergeState({ open: true, ...linkData })
  }

  return (
    <>
      <ToolbarButton
        tooltipTitle="Link"
        color={isActive ? "primary" : "default"}
        variant={isActive ? "contained" : "text"}
        onClick={handleOpen}
        {...rest}
      >
        <Image />
      </ToolbarButton>
      <ImageFormDialog state={state} mergeState={mergeState} />
    </>
  )
}

type TImageFormDialogProps = {
  state: TLinkButtonState
  mergeState(state: Partial<TLinkButtonState>): void
}
export const ImageFormDialog: FC<TImageFormDialogProps> = ({ state, mergeState }) => {
  const editor = useSlate()

  const handleClose = () => {
    mergeState(defaults)
  }

  const handleOk = () => {
    const attributes = {
      href: state.href,
      title: state.title || undefined,
      target: state.target || undefined,
    }
    cleanAttributesMutate(attributes)

    if (!state.range) {
      throw new Error("Invalid range. Must be typeof Range.")
    }
    const command: TSetLinkCommand = {
      type: SET_LINK_COMMAND,
      attributes,
      range: state.range,
      text: state.text,
    }
    editor.exec(command)
    handleClose()
  }

  const handleRemove = () => {
    unwrapLink(editor)
    handleClose()
  }
  return (
    <Dialog open={state.open} onClose={handleClose} aria-labelledby="link-form-dialog-title">
      <DialogTitle id="link-form-dialog-title">Insert/Edit Link</DialogTitle>
      <DialogContent>
        <TextField
          label="Text to display"
          value={state.text}
          onChange={e => mergeState({ text: e.target.value })}
          fullWidth
        />
        <TextField
          label="Attribute: title"
          value={state.title}
          onChange={e => mergeState({ title: e.target.value })}
          fullWidth
        />
        <TextField
          label="Attribute: href"
          value={state.href}
          onChange={e => mergeState({ href: e.target.value })}
          fullWidth
        />
        <TextField
          label="Attribute: target"
          value={state.target}
          onChange={e => mergeState({ target: e.target.value })}
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
        <Button onClick={handleRemove} color="secondary">
          Remove link
        </Button>
        <Button onClick={handleClose} color="primary">
          Cancel
        </Button>
        <Button onClick={handleOk} color="primary">
          OK
        </Button>
      </DialogActions>
    </Dialog>
  )
}
