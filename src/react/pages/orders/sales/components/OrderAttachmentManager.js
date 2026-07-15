import React, {useCallback, useEffect, useMemo, useState} from 'react';
import {
  Image,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import {MaterialCommunityIcons} from '@expo/vector-icons';
import {useStore} from '@store';
import AnimatedModal from '@controleonline/ui-common/src/react/components/AnimatedModal';
import {useMessage} from '@controleonline/ui-common/src/react/components/MessageService';
import {
  resolveFileDownloadUrl,
  resolveFileImageUrl,
} from '@controleonline/ui-common/src/react/utils/fileUrl';
import {
  toFileIri,
  uploadFileToApi,
} from '@controleonline/ui-products/src/react/services/fileUpload';
import {
  extractCollectionItems,
  hasHydraNext,
} from '@controleonline/ui-products/src/react/domain/menuCostsPagination';
import styles from './OrderAttachmentManager.styles';

const ORDER_ATTACHMENTS_CONTEXT = 'order-attachments';

const getEntityId = entity => {
  if (!entity) return null;

  if (typeof entity === 'number' || typeof entity === 'string') {
    const matches = String(entity).match(/\d+/g);
    return matches ? Number(matches[matches.length - 1]) : null;
  }

  if (typeof entity === 'object') {
    if (entity.id) return Number(entity.id);
    if (entity['@id']) {
      const matches = String(entity['@id']).match(/\d+/g);
      return matches ? Number(matches[matches.length - 1]) : null;
    }
  }

  return null;
};

const getRelationId = relation => getEntityId(relation?.id || relation);

const getRelationFile = relation => relation?.file || relation || null;

const getFileId = file => getEntityId(file);

const getFileName = file =>
  file?.fileName ||
  file?.name ||
  file?.originalName ||
  (getFileId(file) ? `Arquivo ${getFileId(file)}` : 'Arquivo');

const getFileKindLabel = file => {
  const type = String(file?.fileType || '').trim().toLowerCase();
  const extension = String(file?.extension || '').trim().toLowerCase();

  if (type && extension) {
    return `${type}/${extension}`;
  }

  if (type) return type;
  if (extension) return extension;
  return 'arquivo';
};

const getFileIconName = file => {
  const type = String(file?.fileType || '').trim().toLowerCase();
  const extension = String(file?.extension || '').trim().toLowerCase();

  if (type === 'image') return 'image';
  if (type === 'text' || extension === 'txt' || extension === 'csv') return 'file-document-outline';
  if (extension === 'pdf') return 'file-pdf-box';
  if (['zip', 'rar', '7z'].includes(extension)) return 'folder-zip-outline';
  return 'file-outline';
};

const sortFilesByName = files =>
  [...files].sort((left, right) =>
    getFileName(left).localeCompare(getFileName(right), 'pt-BR', {sensitivity: 'base'}),
  );

const dedupeFiles = files => {
  const seen = new Set();

  return files.filter(file => {
    const fileId = getFileId(file);
    if (!fileId || seen.has(String(fileId))) {
      return false;
    }

    seen.add(String(fileId));
    return true;
  });
};

const getNativeWebView = () => {
  if (Platform.OS === 'web') {
    return null;
  }

  try {
    return require('react-native-webview').WebView;
  } catch {
    return null;
  }
};

const NativeWebView = getNativeWebView();

const OrderAttachmentManager = ({
  visible = false,
  onClose = () => {},
  order = null,
  company = null,
  onChanged,
}) => {
  const {showError, showSuccess} = useMessage();
  const peopleStore = useStore('people');
  const fileStore = useStore('file');
  const orderFileStore = useStore('order_file');

  const {currentCompany, defaultCompany} = peopleStore.getters || {};
  const resolvedCompany = company || currentCompany || defaultCompany || null;
  const companyId = useMemo(() => getEntityId(resolvedCompany), [resolvedCompany]);
  const companyIri = useMemo(
    () => (companyId ? `/people/${companyId}` : null),
    [companyId],
  );
  const orderId = useMemo(() => getEntityId(order), [order]);
  const orderIri = useMemo(() => (orderId ? `/orders/${orderId}` : null), [orderId]);

  const orderActions = orderFileStore.actions || {};
  const fileActions = fileStore.actions || {};
  const attachedFiles = Array.isArray(orderFileStore.getters?.items)
    ? orderFileStore.getters.items
    : [];

  const [libraryFiles, setLibraryFiles] = useState([]);
  const [libraryPage, setLibraryPage] = useState(1);
  const [libraryHasMore, setLibraryHasMore] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [loadingLibrary, setLoadingLibrary] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [savingFileId, setSavingFileId] = useState(null);
  const [removingRelationId, setRemovingRelationId] = useState(null);
  const [previewFile, setPreviewFile] = useState(null);

  const attachedFileIds = useMemo(
    () =>
      new Set(
        attachedFiles
          .map(relation => getFileId(getRelationFile(relation)))
          .filter(Boolean)
          .map(String),
      ),
    [attachedFiles],
  );

  const filteredLibraryFiles = useMemo(() => {
    const query = String(searchText || '').trim().toLowerCase();
    const files = sortFilesByName(libraryFiles);

    if (!query) return files;

    return files.filter(file => {
      const fileName = getFileName(file).toLowerCase();
      const fileKind = getFileKindLabel(file).toLowerCase();
      return fileName.includes(query) || fileKind.includes(query);
    });
  }, [libraryFiles, searchText]);

  const loadAttachments = useCallback(async () => {
    if (!orderIri || typeof orderActions.getItems !== 'function') {
      return [];
    }

    try {
      const response = await orderActions.getItems({
        order: orderIri,
        page: 1,
      });

      return extractCollectionItems(response);
    } catch (error) {
      showError(error?.message || 'Falha ao carregar anexos do pedido.');
      return [];
    }
  }, [orderActions, orderIri, showError]);

  const loadLibraryPage = useCallback(
    async ({page = 1, append = false} = {}) => {
      if (typeof fileActions.getItems !== 'function') {
        return [];
      }

      const nextPage = Number(page || 1) > 0 ? Number(page) : 1;

      try {
        if (nextPage > 1) {
          setLoadingMore(true);
        } else {
          setLoadingLibrary(true);
        }

        const response = await fileActions.getItems({
          context: ORDER_ATTACHMENTS_CONTEXT,
          ...(companyIri ? {people: companyIri} : {}),
          page: nextPage,
        });

        const normalized = sortFilesByName(extractCollectionItems(response));
        setLibraryPage(nextPage);
        setLibraryHasMore(hasHydraNext(response));

        setLibraryFiles(currentFiles =>
          append
            ? dedupeFiles(sortFilesByName([...currentFiles, ...normalized]))
            : normalized,
        );

        return normalized;
      } catch (error) {
        showError(error?.message || 'Falha ao carregar a biblioteca de arquivos.');
        if (!append) {
          setLibraryFiles([]);
        }
        return [];
      } finally {
        setLoadingLibrary(false);
        setLoadingMore(false);
      }
    },
    [companyIri, fileActions, showError],
  );

  const refreshManager = useCallback(async () => {
    if (!visible || !orderIri) {
      return;
    }

    await Promise.all([loadAttachments(), loadLibraryPage({page: 1, append: false})]);
  }, [loadAttachments, loadLibraryPage, orderIri, visible]);

  useEffect(() => {
    if (!visible || !orderIri) {
      return;
    }

    setSearchText('');
    setLibraryPage(1);
    setLibraryHasMore(false);
    void refreshManager();
  }, [orderIri, refreshManager, visible]);

  useEffect(() => {
    if (!visible) {
      setPreviewFile(null);
    }
  }, [visible]);

  const selectFile = useCallback(async () => {
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      return new Promise(resolve => {
        const input = document.createElement('input');
        input.type = 'file';
        input.onchange = event => resolve(event?.target?.files?.[0] || null);
        input.click();
      });
    }

    const result = await DocumentPicker.getDocumentAsync({
      type: '*/*',
      copyToCacheDirectory: true,
      multiple: false,
    });

    if (result.canceled) {
      return null;
    }

    return result.assets?.[0] || null;
  }, []);

  const attachFileToOrder = useCallback(
    async (fileObj, {successMessage = 'Arquivo anexado com sucesso.'} = {}) => {
      if (!orderIri) {
        showError('Salve o pedido antes de anexar arquivos.');
        return null;
      }

      const fileId = getFileId(fileObj);
      if (!fileId) {
        showError('Arquivo sem identificador.');
        return null;
      }

      if (attachedFileIds.has(String(fileId))) {
        showSuccess('Arquivo ja esta vinculado ao pedido.');
        return null;
      }

      try {
        const savedRelation = await orderActions.save({
          order: orderIri,
          file: toFileIri(fileObj),
        });

        showSuccess(successMessage);
        await onChanged?.();
        await loadAttachments();
        return savedRelation;
      } catch (error) {
        const message = String(error?.message || error?.response?.data?.detail || '');
        if (/unique|duplicate|duplic/i.test(message)) {
          showSuccess('Arquivo ja esta vinculado ao pedido.');
          await onChanged?.();
          await loadAttachments();
          return null;
        }

        showError(error?.message || 'Falha ao vincular arquivo ao pedido.');
        throw error;
      }
    },
    [
      attachedFileIds,
      loadAttachments,
      onChanged,
      orderActions,
      orderIri,
      showError,
      showSuccess,
    ],
  );

  const handleUpload = useCallback(async () => {
    if (!orderIri) {
      showError('Salve o pedido antes de anexar arquivos.');
      return;
    }

    const pickedFile = await selectFile();
    if (!pickedFile) {
      return;
    }

    try {
      setUploading(true);

      const uploadedFile = await uploadFileToApi({
        file: pickedFile,
        context: ORDER_ATTACHMENTS_CONTEXT,
        peopleId: companyId,
      });

      await attachFileToOrder(uploadedFile, {
        successMessage: 'Arquivo enviado e vinculado com sucesso.',
      });

      setLibraryFiles(currentFiles =>
        dedupeFiles(sortFilesByName([uploadedFile, ...currentFiles])),
      );
    } catch (error) {
      showError(error?.message || 'Falha ao enviar o arquivo.');
    } finally {
      setUploading(false);
    }
  }, [
    attachFileToOrder,
    companyId,
    orderIri,
    selectFile,
    showError,
  ]);

  const handleAttachExisting = useCallback(
    async file => {
      const fileId = getFileId(file);
      if (!fileId) {
        showError('Arquivo sem identificador.');
        return;
      }

      if (attachedFileIds.has(String(fileId))) {
        showSuccess('Arquivo ja esta vinculado ao pedido.');
        return;
      }

      try {
        setSavingFileId(fileId);
        await attachFileToOrder(file);
      } finally {
        setSavingFileId(null);
      }
    },
    [attachFileToOrder, attachedFileIds, showError, showSuccess],
  );

  const handleRemove = useCallback(
    async relation => {
      const relationId = getRelationId(relation);
      if (!relationId) {
        showError('Anexo sem identificador para remocao.');
        return;
      }

      try {
        setRemovingRelationId(relationId);
        await orderActions.remove(relationId);
        showSuccess('Arquivo removido do pedido.');
        await onChanged?.();
        await loadAttachments();
      } catch (error) {
        showError(error?.message || 'Falha ao remover o anexo.');
      } finally {
        setRemovingRelationId(null);
      }
    },
    [loadAttachments, onChanged, orderActions, showError, showSuccess],
  );

  const handleOpenFile = useCallback(async file => {
    const fileUrl = resolveFileDownloadUrl(file, {company: resolvedCompany});
    if (!fileUrl) {
      showError('Nao foi possivel abrir o arquivo.');
      return;
    }

    setPreviewFile(file);
  }, [resolvedCompany, showError]);

  const previewUrl = useMemo(() => {
    if (!previewFile) {
      return '';
    }

    return resolveFileDownloadUrl(previewFile, {company: resolvedCompany});
  }, [previewFile, resolvedCompany]);

  const previewIsImage = useMemo(() => {
    const fileType = String(previewFile?.fileType || '').trim().toLowerCase();
    const fileName = String(previewFile?.fileName || previewFile?.name || previewFile?.path || '').trim().toLowerCase();
    return fileType === 'image' || /\.(png|jpe?g|gif|webp|bmp|svg)$/i.test(fileName);
  }, [previewFile]);

  const closePreview = useCallback(() => {
    setPreviewFile(null);
  }, []);

  const renderFileThumb = useCallback(
    file => {
      const imageUrl = String(file?.fileType || '').toLowerCase() === 'image'
        ? resolveFileImageUrl(file, {company: resolvedCompany})
        : '';

      if (imageUrl) {
        return (
          <Image
            source={{uri: imageUrl}}
            style={styles.attachmentImage}
            resizeMode="cover"
          />
        );
      }

      return (
        <View style={styles.attachmentIconWrap}>
          <MaterialCommunityIcons
            name={getFileIconName(file)}
            size={24}
            color="#334155"
          />
        </View>
      );
    },
    [resolvedCompany],
  );

  const renderAttachmentRow = useCallback(
    relation => {
      const file = getRelationFile(relation);
      const fileId = getFileId(file);
      const relationId = getRelationId(relation);
      const isRemoving = String(removingRelationId || '') === String(relationId || '');

      return (
        <View
          key={relationId || fileId || getFileName(file)}
          style={[
            styles.attachmentCard,
            attachedFileIds.has(String(fileId || '')) && styles.attachmentCardAttached,
          ]}
        >
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() => handleOpenFile(file)}
            style={styles.attachmentPreview}
          >
            {renderFileThumb(file)}
          </TouchableOpacity>

          <View style={styles.attachmentBody}>
            <Text style={styles.attachmentName} numberOfLines={2}>
              {getFileName(file)}
            </Text>
            <View style={styles.attachmentMetaRow}>
              <Text style={[styles.attachmentBadge, styles.attachmentBadgeNeutral]}>
                {getFileKindLabel(file)}
              </Text>
              <Text style={[styles.attachmentBadge, styles.attachmentBadgeAttached]}>
                {global.t?.t('orders', 'label', 'attached') || 'Vinculado'}
              </Text>
            </View>
          </View>

          <View style={styles.attachmentActions}>
            <TouchableOpacity
              onPress={() => handleOpenFile(file)}
              style={styles.iconActionButton}
            >
              <MaterialCommunityIcons name="open-in-new" size={18} color="#0F172A" />
            </TouchableOpacity>
              <TouchableOpacity
              onPress={() => handleRemove(relation)}
              disabled={isRemoving}
              style={[
                styles.iconActionButton,
                styles.iconActionButtonDanger,
                isRemoving && {opacity: 0.65},
              ]}
            >
              <MaterialCommunityIcons
                name={isRemoving ? 'progress-clock' : 'delete-outline'}
                size={18}
                color="#B91C1C"
              />
            </TouchableOpacity>
          </View>
        </View>
      );
    },
    [
      attachedFileIds,
      handleOpenFile,
      handleRemove,
      renderFileThumb,
      removingRelationId,
    ],
  );

  const renderLibraryRow = useCallback(
    file => {
      const fileId = getFileId(file);
      const isAttached = fileId && attachedFileIds.has(String(fileId));
      const isSaving = String(savingFileId || '') === String(fileId || '');

      return (
        <View
          key={fileId || file?.['@id'] || getFileName(file)}
          style={[
            styles.attachmentCard,
            isAttached && styles.attachmentCardAttached,
          ]}
        >
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() => handleOpenFile(file)}
            style={styles.attachmentPreview}
          >
            {renderFileThumb(file)}
          </TouchableOpacity>

          <View style={styles.attachmentBody}>
            <Text style={styles.attachmentName} numberOfLines={2}>
              {getFileName(file)}
            </Text>
            <View style={styles.attachmentMetaRow}>
              <Text style={[styles.attachmentBadge, styles.attachmentBadgeNeutral]}>
                {getFileKindLabel(file)}
              </Text>
              {isAttached ? (
                <Text style={[styles.attachmentBadge, styles.attachmentBadgeAttached]}>
                  {global.t?.t('orders', 'label', 'attached') || 'Vinculado'}
                </Text>
              ) : (
                <Text style={[styles.attachmentBadge, styles.attachmentBadgePrimary]}>
                  {global.t?.t('orders', 'button', 'attach') || 'Anexar'}
                </Text>
              )}
            </View>
          </View>

          <View style={styles.attachmentActions}>
            <TouchableOpacity
              onPress={() => handleOpenFile(file)}
              style={styles.iconActionButton}
            >
              <MaterialCommunityIcons name="open-in-new" size={18} color="#0F172A" />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => handleAttachExisting(file)}
              disabled={isAttached || isSaving}
              style={[
                styles.iconActionButton,
                styles.iconActionButtonPrimary,
                (isAttached || isSaving) && {opacity: 0.65},
              ]}
            >
              <MaterialCommunityIcons
                name={isSaving ? 'progress-clock' : isAttached ? 'check' : 'paperclip'}
                size={18}
                color="#fff"
              />
            </TouchableOpacity>
          </View>
        </View>
      );
    },
    [attachedFileIds, handleAttachExisting, handleOpenFile, renderFileThumb, savingFileId],
  );

  const handleLoadMore = useCallback(async () => {
    if (loadingLibrary || loadingMore || !libraryHasMore) {
      return;
    }

    await loadLibraryPage({page: libraryPage + 1, append: true});
  }, [libraryHasMore, libraryPage, loadLibraryPage, loadingLibrary, loadingMore]);

  if (!visible || !orderIri) {
    return null;
  }

  const orderLabel = `#${orderId || '--'}`;

  return (
    <AnimatedModal visible={visible} onRequestClose={onClose} style={styles.modalAlignEnd}>
      <View style={styles.sheet}>
        <View style={styles.header}>
          <View style={styles.headerTextWrap}>
            <Text style={styles.title}>
              {global.t?.t('orders', 'title', 'attachments') || 'Anexos do pedido'} {orderLabel}
            </Text>
            <Text style={styles.subtitle}>
              {global.t?.t('orders', 'message', 'manageOrderFiles') ||
                'Use a biblioteca para subir, anexar e remover arquivos do pedido.'}
            </Text>
          </View>

          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <MaterialCommunityIcons name="close" size={22} color="#64748B" />
          </TouchableOpacity>
        </View>

        <ScrollView
          style={styles.content}
          contentContainerStyle={{paddingBottom: 20}}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.toolbar}>
            <View style={styles.searchBox}>
              <MaterialCommunityIcons name="magnify" size={18} color="#94A3B8" />
              <TextInput
                value={searchText}
                onChangeText={setSearchText}
                placeholder={global.t?.t('orders', 'placeholder', 'searchFiles') || 'Buscar arquivo'}
                placeholderTextColor="#94A3B8"
                style={styles.searchInput}
              />
              {!!searchText && (
                <TouchableOpacity onPress={() => setSearchText('')} style={styles.searchClearButton}>
                  <MaterialCommunityIcons name="close-circle" size={18} color="#94A3B8" />
                </TouchableOpacity>
              )}
            </View>

            <TouchableOpacity
              onPress={handleUpload}
              disabled={uploading}
              style={[styles.uploadButton, uploading && styles.uploadButtonDisabled]}
            >
              <MaterialCommunityIcons
                name={uploading ? 'progress-clock' : 'cloud-upload-outline'}
                size={18}
                color="#fff"
              />
              <Text style={styles.uploadButtonText}>
                {uploading
                  ? global.t?.t('orders', 'label', 'uploading') || 'Enviando'
                  : global.t?.t('orders', 'button', 'uploadFile') || 'Enviar arquivo'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={refreshManager}
              disabled={loadingLibrary || loadingMore}
              style={styles.refreshButton}
            >
              <MaterialCommunityIcons name="refresh" size={19} color="#334155" />
            </TouchableOpacity>
          </View>

          {previewFile ? (
            <View style={{
              marginBottom: 16,
              borderRadius: 14,
              overflow: 'hidden',
              borderWidth: 1,
              borderColor: '#E2E8F0',
              backgroundColor: '#fff',
            }}>
              <View style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingHorizontal: 12,
                paddingVertical: 10,
                borderBottomWidth: 1,
                borderBottomColor: '#E2E8F0',
              }}>
                <View style={{flex: 1, paddingRight: 12}}>
                  <Text style={{fontSize: 14, fontWeight: '800', color: '#0F172A'}} numberOfLines={1}>
                    {getFileName(previewFile)}
                  </Text>
                  <Text style={{fontSize: 12, color: '#64748B'}} numberOfLines={1}>
                    {getFileKindLabel(previewFile)}
                  </Text>
                </View>
                <TouchableOpacity onPress={closePreview} style={{padding: 6}}>
                  <MaterialCommunityIcons name="close" size={20} color="#475569" />
                </TouchableOpacity>
              </View>

              <View style={{height: 420, backgroundColor: '#0F172A'}}>
                {previewIsImage && previewUrl ? (
                  <Image
                    source={{uri: previewUrl}}
                    style={{width: '100%', height: '100%'}}
                    resizeMode="contain"
                  />
                ) : Platform.OS === 'web' ? (
                  <iframe
                    title={getFileName(previewFile)}
                    src={previewUrl}
                    style={{width: '100%', height: '100%', border: 0, background: '#fff'}}
                  />
                ) : NativeWebView ? (
                  <NativeWebView
                    source={{uri: previewUrl}}
                    style={{flex: 1, backgroundColor: '#fff'}}
                    startInLoadingState
                  />
                ) : (
                  <View style={{
                    flex: 1,
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: 24,
                    backgroundColor: '#fff',
                  }}>
                    <MaterialCommunityIcons name="file-outline" size={44} color="#94A3B8" />
                    <Text style={{marginTop: 12, fontSize: 14, color: '#334155', textAlign: 'center'}}>
                      Pré-visualização não suportada neste dispositivo.
                    </Text>
                  </View>
                )}
              </View>
            </View>
          ) : null}

          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>
                {global.t?.t('orders', 'title', 'currentAttachments') || 'Anexos vinculados'}
              </Text>
              <Text style={styles.sectionMeta}>{attachedFiles.length}</Text>
            </View>

            {attachedFiles.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyStateText}>
                  {global.t?.t('orders', 'message', 'noAttachmentsLinked') ||
                    'Nenhum arquivo vinculado a este pedido.'}
                </Text>
              </View>
            ) : (
              <View style={styles.attachmentList}>
                {attachedFiles.map(renderAttachmentRow)}
              </View>
            )}
          </View>

          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>
                {global.t?.t('orders', 'title', 'fileLibrary') || 'Biblioteca de arquivos'}
              </Text>
              <Text style={styles.sectionMeta}>{filteredLibraryFiles.length}</Text>
            </View>

            {loadingLibrary && filteredLibraryFiles.length === 0 ? (
              <View style={styles.loadingState}>
                <MaterialCommunityIcons name="progress-clock" size={18} color="#0F172A" />
                <Text style={styles.loadingText}>
                  {global.t?.t('orders', 'label', 'loading') || 'Carregando arquivos...'}
                </Text>
              </View>
            ) : filteredLibraryFiles.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyStateText}>
                  {global.t?.t('orders', 'message', 'noFilesFound') ||
                    'Nenhum arquivo encontrado na biblioteca.'}
                </Text>
              </View>
            ) : (
              <View style={styles.attachmentList}>
                {filteredLibraryFiles.map(renderLibraryRow)}
              </View>
            )}

            {libraryHasMore ? (
              <TouchableOpacity
                onPress={handleLoadMore}
                disabled={loadingMore}
                style={styles.loadMoreButton}
              >
                {loadingMore ? (
                  <MaterialCommunityIcons name="progress-clock" size={18} color="#0F172A" />
                ) : (
                  <Text style={styles.loadMoreButtonText}>
                    {global.t?.t('orders', 'button', 'loadMore') || 'Carregar mais'}
                  </Text>
                )}
              </TouchableOpacity>
            ) : null}
          </View>
        </ScrollView>
      </View>
    </AnimatedModal>
  );
};

export default OrderAttachmentManager;
