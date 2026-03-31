import React from "react";
import EmojiPickerReact from "emoji-picker-react";
import useUiStore from "../../store/uiStore";

const EmojiPicker = ({ onSelect, onClose }) => {
    const theme = useUiStore((s) => s.theme);

    return (
        <div className="relative">
            {/* Backdrop to close */}
            <div className="fixed inset-0 z-40" onClick={onClose} />

            <div className="relative z-50 rounded-2xl overflow-hidden shadow-2xl">
                <EmojiPickerReact
                    onEmojiClick={(emojiData) => onSelect(emojiData.emoji)}
                    theme={theme === "dark" ? "dark" : "light"}
                    width={320}
                    height={400}
                    searchPlaceHolder="Search emoji..."
                    skinTonesDisabled
                    previewConfig={{ showPreview: false }}
                />
            </div>
        </div>
    );
};

export default EmojiPicker;
