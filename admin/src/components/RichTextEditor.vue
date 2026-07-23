<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { ElMessageBox } from 'element-plus';

import { useAdminI18n } from '@/i18n';

const props = withDefaults(defineProps<{
  modelValue: string;
  placeholder?: string;
  minHeight?: number;
}>(), {
  minHeight: 220,
});

const emit = defineEmits<{
  'update:modelValue': [value: string];
}>();

const { t } = useAdminI18n();
const editorRef = ref<HTMLDivElement | null>(null);
const sourceMode = ref(false);
const localValue = ref(props.modelValue || '');
const savedRange = ref<Range | null>(null);
const isEditorFocused = ref(false);
const undoStack = ref<string[]>([]);
const redoStack = ref<string[]>([]);
const isApplyingHistory = ref(false);

const MAX_HISTORY_ITEMS = 100;

const plainText = computed(() => localValue.value.replace(/<[^>]*>/g, ' '));
const charCount = computed(() => plainText.value.trim().length);
const wordCount = computed(() => plainText.value.trim().split(/\s+/).filter(Boolean).length);
const editorPlaceholder = computed(() => props.placeholder || t('richText.placeholder'));

const isSelectionInsideEditor = () => {
  const editor = editorRef.value;
  const selection = window.getSelection();

  if (!editor || !selection || selection.rangeCount === 0) {
    return false;
  }

  const range = selection.getRangeAt(0);
  return editor.contains(range.commonAncestorContainer);
};

const saveSelection = () => {
  if (!isSelectionInsideEditor()) {
    return;
  }

  const selection = window.getSelection();
  savedRange.value = selection?.rangeCount ? selection.getRangeAt(0).cloneRange() : null;
};

const restoreSelection = () => {
  const editor = editorRef.value;
  const selection = window.getSelection();

  if (!editor || !selection) {
    return;
  }

  editor.focus();
  selection.removeAllRanges();

  if (savedRange.value && editor.contains(savedRange.value.commonAncestorContainer)) {
    selection.addRange(savedRange.value);
    return;
  }

  const range = document.createRange();
  range.selectNodeContents(editor);
  range.collapse(false);
  selection.addRange(range);
  savedRange.value = range.cloneRange();
};

const placeCaretAtEnd = () => {
  const editor = editorRef.value;
  const selection = window.getSelection();

  if (!editor || !selection) {
    return;
  }

  editor.focus();
  const range = document.createRange();
  range.selectNodeContents(editor);
  range.collapse(false);
  selection.removeAllRanges();
  selection.addRange(range);
  savedRange.value = range.cloneRange();
};

const syncEditor = async () => {
  await nextTick();
  const editor = editorRef.value;

  if (
    editor &&
    !sourceMode.value &&
    !isEditorFocused.value &&
    editor.innerHTML !== localValue.value
  ) {
    editor.innerHTML = localValue.value;
  }
};

const applyEditorValue = async (value: string) => {
  isApplyingHistory.value = true;
  localValue.value = value;
  emit('update:modelValue', value);

  await nextTick();

  if (editorRef.value && !sourceMode.value) {
    editorRef.value.innerHTML = value;
    placeCaretAtEnd();
  }

  isApplyingHistory.value = false;
};

const pushUndoSnapshot = (value = localValue.value) => {
  if (isApplyingHistory.value) {
    return;
  }

  const lastValue = undoStack.value[undoStack.value.length - 1];
  if (lastValue === value) {
    return;
  }

  undoStack.value.push(value);
  if (undoStack.value.length > MAX_HISTORY_ITEMS) {
    undoStack.value.shift();
  }

  redoStack.value = [];
};

const undo = () => {
  const previousValue = undoStack.value.pop();

  if (previousValue === undefined) {
    return;
  }

  redoStack.value.push(localValue.value);
  applyEditorValue(previousValue);
};

const redo = () => {
  const nextValue = redoStack.value.pop();

  if (nextValue === undefined) {
    return;
  }

  undoStack.value.push(localValue.value);
  applyEditorValue(nextValue);
};

const handleBeforeInput = () => {
  pushUndoSnapshot();
};

watch(
  () => props.modelValue,
  (value) => {
    if (value !== localValue.value) {
      localValue.value = value || '';
      if (!isApplyingHistory.value) {
        undoStack.value = [];
        redoStack.value = [];
      }
      syncEditor();
    }
  },
);

watch(sourceMode, () => {
  syncEditor();
});

const updateValue = (value: string) => {
  if (value === localValue.value) {
    return;
  }

  localValue.value = value;
  emit('update:modelValue', value);
};

const handleInput = () => {
  updateValue(editorRef.value?.innerHTML ?? '');
  saveSelection();
};

const handleFocus = () => {
  isEditorFocused.value = true;
  saveSelection();
};

const handleBlur = () => {
  isEditorFocused.value = false;
  handleInput();
};

const runCommand = (command: string, value?: string) => {
  sourceMode.value = false;
  restoreSelection();
  pushUndoSnapshot();
  document.execCommand(command, false, value);
  handleInput();
  saveSelection();
};

const formatBlock = (tag: string) => runCommand('formatBlock', tag);

const insertLink = async () => {
  try {
    const { value } = await ElMessageBox.prompt(t('richText.linkPrompt'), t('richText.linkTitle'), {
      confirmButtonText: t('richText.add'),
      cancelButtonText: t('richText.cancel'),
      inputPlaceholder: 'https://example.com',
      inputPattern: /^https?:\/\/.+/i,
      inputErrorMessage: t('richText.linkError'),
    });
    restoreSelection();
    runCommand('createLink', value);
  } catch {
    // User cancelled the prompt.
  }
};

const clearFormatting = () => runCommand('removeFormat');

const handleSourceInput = (event: Event) => {
  updateValue((event.target as HTMLTextAreaElement).value);
};

const handleKeydown = (event: KeyboardEvent) => {
  const isUndoShortcut =
    (event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'z' && !event.shiftKey;
  const isRedoShortcut =
    (event.metaKey || event.ctrlKey) &&
    (event.key.toLowerCase() === 'y' || (event.key.toLowerCase() === 'z' && event.shiftKey));

  if (isUndoShortcut) {
    event.preventDefault();
    undo();
    return;
  }

  if (isRedoShortcut) {
    event.preventDefault();
    redo();
  }
};

onMounted(() => {
  syncEditor();
  document.addEventListener('selectionchange', saveSelection);
});

onBeforeUnmount(() => {
  document.removeEventListener('selectionchange', saveSelection);
});
</script>

<template>
  <div class="rich-editor">
    <div class="rich-editor-toolbar" @mousedown.prevent>
      <button
        type="button"
        :title="t('richText.undo')"
        :disabled="!undoStack.length"
        @click="undo"
      >
        ↶
      </button>
      <button
        type="button"
        :title="t('richText.redo')"
        :disabled="!redoStack.length"
        @click="redo"
      >
        ↷
      </button>

      <span class="toolbar-divider" />

      <button type="button" :title="t('richText.bold')" @click="runCommand('bold')">
        B
      </button>
      <button type="button" :title="t('richText.italic')" @click="runCommand('italic')">
        I
      </button>
      <button type="button" :title="t('richText.underline')" @click="runCommand('underline')">
        U
      </button>

      <span class="toolbar-divider" />

      <button type="button" :title="t('richText.paragraph')" @click="formatBlock('p')">P</button>
      <button type="button" :title="t('richText.h2')" @click="formatBlock('h2')">H2</button>
      <button type="button" :title="t('richText.h3')" @click="formatBlock('h3')">H3</button>

      <span class="toolbar-divider" />

      <button type="button" :title="t('richText.bulletList')" @click="runCommand('insertUnorderedList')">
        •
      </button>
      <button type="button" :title="t('richText.orderedList')" @click="runCommand('insertOrderedList')">
        1.
      </button>
      <button type="button" :title="t('richText.outdent')" @click="runCommand('outdent')">
        ←
      </button>
      <button type="button" :title="t('richText.indent')" @click="runCommand('indent')">
        →
      </button>

      <span class="toolbar-divider" />

      <button type="button" :title="t('richText.alignLeft')" @click="runCommand('justifyLeft')">
        L
      </button>
      <button type="button" :title="t('richText.alignCenter')" @click="runCommand('justifyCenter')">
        C
      </button>
      <button type="button" :title="t('richText.alignRight')" @click="runCommand('justifyRight')">
        R
      </button>
      <button type="button" :title="t('richText.horizontalRule')" @click="runCommand('insertHorizontalRule')">
        —
      </button>

      <span class="toolbar-divider" />

      <button type="button" :title="t('richText.color')" @click="runCommand('foreColor', '#285aff')">
        A
      </button>
      <button type="button" :title="t('richText.link')" @click="insertLink">
        URL
      </button>
      <button type="button" :title="t('richText.clear')" @click="clearFormatting">
        ✕
      </button>
      <button type="button" :title="sourceMode ? t('richText.visualMode') : t('richText.htmlMode')" @click="sourceMode = !sourceMode">
        {{ sourceMode ? 'VIEW' : '<>' }}
      </button>
    </div>

    <textarea
      v-if="sourceMode"
      class="rich-editor-source"
      :style="{ minHeight: `${minHeight}px` }"
      :value="localValue"
      :placeholder="editorPlaceholder"
      @beforeinput="handleBeforeInput"
      @input="handleSourceInput"
      @keydown="handleKeydown"
    />
    <div
      v-else
      ref="editorRef"
      class="rich-editor-body"
      :style="{ minHeight: `${minHeight}px` }"
      contenteditable="true"
      :data-placeholder="editorPlaceholder"
      @beforeinput="handleBeforeInput"
      @input="handleInput"
      @focus="handleFocus"
      @mouseup="saveSelection"
      @keyup="saveSelection"
      @keydown="handleKeydown"
      @blur="handleBlur"
    />

    <div class="rich-editor-status">
      <span>CHARS: {{ charCount }}</span>
      <span>WORDS: {{ wordCount }}</span>
      <span>HTML</span>
    </div>
  </div>
</template>

<style scoped>
.rich-editor {
  width: 100%;
  overflow: hidden;
  border: 1px solid #d8dde6;
  border-radius: 8px;
  background: #ffffff;
}

.rich-editor-toolbar {
  display: flex;
  align-items: center;
  gap: 0;
  min-height: 42px;
  overflow-x: auto;
  border-bottom: 1px solid #e5e7eb;
  background: #f8fafc;
}

.rich-editor-toolbar button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 38px;
  height: 38px;
  border: 0;
  border-right: 1px solid #e5e7eb;
  background: transparent;
  color: #303133;
  font: inherit;
  font-weight: 700;
  cursor: pointer;
}

.rich-editor-toolbar button:hover {
  background: #eef5ff;
  color: #409eff;
}

.rich-editor-toolbar button:disabled {
  color: #b5bdca;
  cursor: not-allowed;
}

.rich-editor-toolbar button:disabled:hover {
  background: transparent;
  color: #b5bdca;
}

.toolbar-divider {
  width: 1px;
  height: 24px;
  margin: 0 4px;
  background: #d8dde6;
  flex: 0 0 auto;
}

.rich-editor-body,
.rich-editor-source {
  width: 100%;
  padding: 14px;
  border: 0;
  outline: none;
  background: #ffffff;
  color: #111827;
  font: inherit;
  line-height: 1.7;
  resize: vertical;
  box-sizing: border-box;
}

.rich-editor-body:empty::before {
  content: attr(data-placeholder);
  color: #a8abb2;
}

.rich-editor-body :deep(h2) {
  margin: 0 0 12px;
  font-size: 26px;
  line-height: 1.25;
}

.rich-editor-body :deep(h3) {
  margin: 0 0 10px;
  font-size: 22px;
  line-height: 1.3;
}

.rich-editor-body :deep(p) {
  margin: 0 0 12px;
}

.rich-editor-body :deep(ul),
.rich-editor-body :deep(ol) {
  margin: 0 0 12px 22px;
}

.rich-editor-status {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding: 5px 10px;
  border-top: 1px solid #e5e7eb;
  background: #f8fafc;
  color: #6b7280;
  font-size: 11px;
  line-height: 1.2;
}

@media (max-width: 720px) {
  .rich-editor-toolbar button {
    width: 36px;
    height: 36px;
  }

  .rich-editor-status {
    justify-content: flex-start;
    flex-wrap: wrap;
  }
}
</style>
