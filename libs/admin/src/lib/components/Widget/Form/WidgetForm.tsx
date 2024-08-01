import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { DropResult } from 'react-beautiful-dnd';

import { SimpleForm } from '../../common/Form';
import DNDItemsList from '../../common/DNDItemsList';
import ItemsAccordian from './ItemsAccordian';

import { useWidgetState } from '../../../context/WidgetContext';
import { useProviderState } from '../../../context/ProviderContext';
import {
  capitalizeFirstLetter,
  changeToCode,
  isEmpty,
} from '../../../helper/utils';
import {
  CombineObjectType,
  FormProps,
  ObjectType,
  OptionType,
  SchemaType,
} from '../../../types';
import Tabs from './Tabs';

const constants = {
  widgetTypeAccessor: 'widgetType',
  itemTypeAccessor: 'itemsType',
  collectionNameAccessor: 'collectionName',
  collectionItemsAccessor: 'collectionItems',
  tabsWidgetTypeValue: 'Tabs',
  fixedCardWidgetTypeValue: 'FixedCard',
  carouselWidgetTypeValue: 'Carousel',
  imageItemsTypeValue: 'Image',
  tabsAccessor: 'tabs',
  webItems: 'webItems',
  mobileItems: 'mobileItems',
  tabCollectionItemsAccessor: 'collectionItems',
};

const WidgetForm = ({ formRef, customInputs }: FormProps) => {
  const {
    register,
    formState: { errors },
    handleSubmit,
    reset,
    setValue,
    control,
    watch,
    clearErrors,
    setError,
    getValues,
  } = useForm({
    shouldUnregister: false,
  });
  const { switchClass, commonTranslations } = useProviderState();
  const {
    data,
    canAdd,
    canUpdate,
    formState,
    itemsTypes,
    widgetTypes,
    loading,
    languages,
    widgetTranslations,
    onWidgetFormSubmit,
    getCollectionData,
    collectionData,
    collectionDataLoading,
    formatListItem,
    formatOptionLabel,
    reactSelectStyles,
  } = useWidgetState();
  const callerRef = useRef<NodeJS.Timeout | null>(null);

  const [activeTab, setActiveTab] = useState(0);
  const [itemsEnabled, setItemsEnabled] = useState(true);
  const [webItemsVisible, setWebItemsVisible] = useState(false);
  const [mobileItemsVisible, setMobileItemsVisible] = useState(false);
  const [selectedWidgetType, setSelectedWidgetType] = useState<any>();
  const [selectedCollectionItems, setSelectedCollectionItems] = useState<
    OptionType[]
  >([]);
  const [tabCollectionItems, setTabCollectionItems] = useState<any[]>([]);
  const [selectedCollectionType, setSelectedCollectionType] = useState<
    OptionType | undefined
  >();
  const [collectionItemsUpdated, setCollectionItemsUpdated] = useState(false);
  const [tabCollectionItemsUpdated, setTabCollectionItemsUpdated] = useState<
    boolean[]
  >([]);

  useEffect(() => {
    if (data && formState === 'UPDATE') {
      const widgetType = widgetTypes.find(
        (type) => type.value === data?.widgetType
      );
      setSelectedWidgetType(widgetType);
      if (data?.itemsType !== constants.imageItemsTypeValue || data?.widgetType === "Text") {
        setItemsEnabled(false);
      }
      if (
        data?.collectionName !== constants.imageItemsTypeValue &&
        itemsTypes &&
        itemsTypes.length > 0
      ) {
        setSelectedCollectionType(
          itemsTypes.find((item) => item.value === data?.collectionName)
        );
      }
      if(data?.widgetType === "Text"){
        setItemsEnabled(false);
      }
    }
  }, [data, formState, itemsTypes, widgetTypes]);

  useEffect(() => {
    if (formState === 'ADD') {
      setSelectedCollectionItems([]);
      setItemsEnabled(true);
      setTabCollectionItems([]);
    }
  }, [formState]);

  useEffect(() => {
    if (!isEmpty(data)) {
      reset(data);
    }
  }, [data, reset]);

  const onChangeSearch = (
    str?: string,
    callback?: (options: OptionType[]) => void
  ): any => {
    let collectionItems: any[] = [];
    let valueToSet = '';
    if (formState === 'UPDATE') {
      if (
        data[constants.widgetTypeAccessor] === constants.tabsWidgetTypeValue
      ) {
        collectionItems = data[constants.tabsAccessor][activeTab]
          ? data[constants.tabsAccessor][activeTab][constants.collectionItemsAccessor]
          : [];
        valueToSet = `${constants.tabsAccessor}.${activeTab}.${constants.tabCollectionItemsAccessor}`;
      } else if (
        Array.isArray(data[constants.collectionItemsAccessor]) &&
        data[constants.collectionItemsAccessor].length > 0
      ) {
        if (collectionItemsUpdated)
          collectionItems = selectedCollectionItems.map(
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-ignore
            (collectionItem) => collectionItem._id
          );
        else collectionItems = data[constants.collectionItemsAccessor];
        // valueToSet = constants.collectionItemsAccessor;
      }
    }
    if (callerRef.current) clearTimeout(callerRef.current);
    let item: any;

    callerRef.current = setTimeout(() => {
      if (selectedCollectionType)
        getCollectionData(
          selectedCollectionType.value,
          str,
          (options) => {
            if (typeof callback === 'function')
              callback(
                options.map((item: ObjectType) => ({
                  value: item['_id'] || item['id'],
                  label: item['name'],
                  ...item,
                }))
              );
            if (formState === 'UPDATE') {
              let selectedOptions =
                collectionItems?.map((itemId: string) => {
                  item = (options as any[]).find(
                    (item) => item._id === itemId || item.id === itemId
                  );
                  return item
                    ? {
                        label: item.name,
                        value: item._id || item.id,
                        ...item,
                      }
                    : {};
                }) || [];
              selectedOptions = selectedOptions.filter((obj) => !!obj.value);
              if (valueToSet) {
                // only set tabcollection items, when they are not set
                if (!tabCollectionItemsUpdated[activeTab]) {
                  const updatedArr = tabCollectionItemsUpdated;
                  updatedArr[activeTab] = true;
                  setTabCollectionItemsUpdated(updatedArr);
                  setValue(valueToSet, selectedOptions);
                }
              } else {
                setSelectedCollectionItems(selectedOptions);
                setCollectionItemsUpdated(true);
              }
            }
          },
          collectionItems
        );
    }, 300);
  };

  // Form Utility Functions
  function handleCapitalize(event: React.ChangeEvent<HTMLInputElement>) {
    event.target.value = capitalizeFirstLetter(event.target.value);
    return event;
  }
  function handleCode(event: React.ChangeEvent<HTMLInputElement>) {
    event.target.value = changeToCode(event.target.value);
    return event;
  }
  const getFirstItemTypeValue = useCallback(
    (widgetType: string) => {
      const derivedItemTypes =
        widgetType === constants.tabsWidgetTypeValue
          ? itemsTypes.filter((item) => item.label !== constants.imageItemsTypeValue)
          : itemsTypes;
      return derivedItemTypes[0];
    },
    [itemsTypes]
  );
  const getFirstWidgetTypeValue = useCallback(() => {
    return widgetTypes[0].value;
  }, [widgetTypes]);

  // Widget Form Functions
  const onWidgetFormInputChange = useCallback(
    (value: ObjectType, name: string | undefined) => {     
      if (name === constants.widgetTypeAccessor) {
        const widgetType = widgetTypes.find(
          (type) => type.value === value[name]
        );
        setSelectedWidgetType(widgetType);
        
        if(widgetType?.value === "Text"){
          setItemsEnabled(false)
        }else{
          setItemsEnabled(true)
        }

        if (value[name] === constants.tabsWidgetTypeValue) {
          const firstItemType = getFirstItemTypeValue(value[name]);
          if (firstItemType) {
            setSelectedCollectionType(firstItemType);
          }
        }
      } else if (name === constants.itemTypeAccessor) {
        if (
          value[constants.itemTypeAccessor] === constants.imageItemsTypeValue
        ) {
          setSelectedCollectionType(undefined);
          setItemsEnabled(true);
        } else {
          const selectedWType = itemsTypes.find(
            (wType) => wType.value === value[constants.itemTypeAccessor]
          );
          setSelectedCollectionType(selectedWType);
          setItemsEnabled(false);
        }
      } else if (
        name?.includes(constants.tabsAccessor) &&
        Array.isArray(value[constants.tabsAccessor])
      ) {
        setTabCollectionItems(
          (value[constants.tabsAccessor] as unknown as any[]).map(
            (tabItem) => tabItem[constants.tabCollectionItemsAccessor]
          )
        );
      }  
    },
    [getFirstItemTypeValue, itemsTypes, widgetTypes]
  );
  const validateTabs = (tabsData: any) => {
    const isLanguagesProvided =
      Array.isArray(languages) && languages.length > 0;
    let isTabsValid = true;
    if (Array.isArray(tabsData) && tabsData.length > 0) {
      tabsData.forEach((tabItem: any, index: number) => {
        if (isLanguagesProvided) {
          languages.forEach((lang: any) => {
            if (!tabItem.names[lang.code]) {
              setError(`tabs.${index}.names.${lang.code}`, {
                type: 'manual',
                message: `${widgetTranslations.tabNameRequired} (${lang.name})`,
              });
              isTabsValid = false;
            }
          });
        } else if (!tabItem.name) {
          setError(`tabs.${index}.name`, {
            type: 'manual',
            message: widgetTranslations.tabNameRequired,
          });
          isTabsValid = false;
        }
      });
    }
    return isTabsValid;
  };
  const onFormSubmit = (data: CombineObjectType) => {
    const formData = { ...data };
    // setting widget type if undefined
    if (!formData[constants.widgetTypeAccessor] && formState === 'ADD') {
      formData[constants.widgetTypeAccessor] = getFirstWidgetTypeValue();
    }
    // setting tabs data if widgetType tab is selected
    const tabsData = getValues(constants.tabsAccessor);
    if (Array.isArray(tabsData) && tabsData.length > 0) {
      const isTabsValid = validateTabs(tabsData);
      if (!isTabsValid) return;
    }
    if (
      Array.isArray(tabsData) &&
      (formData[constants.widgetTypeAccessor] ===
        constants.tabsWidgetTypeValue ||
        formState === 'UPDATE')
    ) {
      formData[constants.tabsAccessor] = tabsData.map((tabItem) => ({
        name: tabItem.name,
        names: tabItem.names,
        collectionItems: tabItem.collectionItems.map(
          (item: string | OptionType) =>
            typeof item == 'string' ? item : item.value
        ),
      }));
    } else formData[constants.tabsAccessor] = [];
    // setting items type if undefined
    if (!formData[constants.itemTypeAccessor] && formState === 'ADD') {
      formData[constants.itemTypeAccessor] = getFirstItemTypeValue(
        formData[constants.widgetTypeAccessor] as string
      )?.value;
    }
    // setting collectionName if widgetType is FixedCard or Carousel and FormState
    if (
      formData[constants.itemTypeAccessor] !== constants.imageItemsTypeValue &&
      formState === 'ADD'
    ) {
      formData[constants.collectionNameAccessor] = selectedCollectionType
        ? selectedCollectionType.value
        : getFirstItemTypeValue(
            formData[constants.widgetTypeAccessor] as string
          )?.value;
    }
    // setting colleciton items if collectionItems are there
    if (
      Array.isArray(selectedCollectionItems) &&
      selectedCollectionItems.length > 0
    ) {
      formData[constants.collectionItemsAccessor] = selectedCollectionItems.map(
        (item) => item.value
      );
    }
    let items = [
      ...(getValues(constants.webItems) || []),
      ...(getValues(constants.mobileItems) || []),
    ];
    items = items.map(({ _id, __v, widgetId, ...item }) => {
      if (typeof item['imgs'] === 'object' && item['imgs']) {
        Object.keys(item['imgs']).forEach((key) => {
          if (item['imgs'][key] && item['imgs'][key]['_id']) {
            item['imgs'][key] = item['imgs'][key]['_id'];
          } else if (
            typeof item['imgs'][key] !== 'string' ||
            !item['imgs'][key]
          ) {
            delete item['imgs'][key];
          }
        });
      }
      if (item['img'] && item['img']['_id']) {
        item['img'] = item['img']['_id'];
      } else if (typeof item['img'] !== 'string' || !item['img']) {
        delete item['img'];
      }
      return item;
    });
    onWidgetFormSubmit({
      ...formData,
      items,
    });
  };
  const onCollectionIndexChange = (result: DropResult) => {
    const { destination, source } = result;
    if (destination) {
      setSelectedCollectionItems((listData) => {
        const temporaryData = [...listData];
        const [selectedRow] = temporaryData.splice(source.index, 1);
        temporaryData.splice(destination.index, 0, selectedRow);
        return temporaryData;
      });
    }
  };
  const onTabItemsIndexChange = (index: number, result: DropResult) => {
    const { destination, source } = result;
    if (destination) {
      const tabCollectionItems = getValues(`tabs.${index}.collectionItems`);
      const temporaryData = [...tabCollectionItems];
      const [selectedRow] = temporaryData.splice(source.index, 1);
      temporaryData.splice(destination.index, 0, selectedRow);
      setValue(`tabs.${index}.collectionItems`, temporaryData);
    }
  };

  useEffect(() => {
    const subscription = watch((value, { name }) =>
      onWidgetFormInputChange(value, name)
    );
    return () => subscription.unsubscribe();
  }, [watch, onWidgetFormInputChange]);

  // Schemas
  const widgetFormSchema: SchemaType[] = [
    {
      label: commonTranslations.name,
      required: true,
      accessor: 'name',
      type: 'text',
      placeholder: commonTranslations.namePlaceholder,
      onInput: handleCapitalize,
      validations: {
        required: commonTranslations.nameRequired,
      },
      wrapperClassName: 'khb_grid-item-1of2 khb_padding-right-1 khb_align-top',
    },
    {
      label: commonTranslations.code,
      accessor: 'code',
      required: true,
      type: 'text',
      onInput: handleCode,
      editable: false,
      placeholder: commonTranslations.codePlaceholder,
      validations: {
        required: commonTranslations.codeRequired,
      },
      wrapperClassName:
        'khb_grid-item-1of2 khb_padding-left-1 khb_align-top khb_margin-top-0',
    },
    Array.isArray(languages) && languages.length > 0
      ? {
          label: commonTranslations.title,
          accessor: 'widgetTitles',
          required: true,
          type:
            customInputs && customInputs['widgetTitles'] ? undefined : 'text',
          validations: {
            required: commonTranslations.titleRequired,
          },
          info: widgetTranslations.widgetTitleInfo,
          placeholder: commonTranslations.titlePlaceholder,
          onInput: handleCapitalize,
          Input:
            customInputs && customInputs['widgetTitles']
              ? customInputs['widgetTitles']
              : undefined,
        }
      : {
          label: commonTranslations.title,
          accessor: 'widgetTitle',
          required: true,
          type:
            customInputs && customInputs['widgetTitle'] ? undefined : 'text',
          onInput: handleCapitalize,
          placeholder: commonTranslations.titlePlaceholder,
          validations: {
            required: commonTranslations.titleRequired,
          },
          info: widgetTranslations.widgetTitleInfo,
          Input:
            customInputs && customInputs['widgetTitle']
              ? customInputs['widgetTitle']
              : undefined,
        },
    {
      label: widgetTranslations.widgetType,
      required: true,
      editable: false,
      accessor: constants.widgetTypeAccessor,
      type: 'select',
      validations: {
        required: widgetTranslations.widgetTypeRequired,
      },
      options: widgetTypes,
    },
    {
      label: widgetTranslations.autoPlay,
      accessor: 'autoPlay',
      type: 'checkbox',
      show: selectedWidgetType?.value === 'Carousel',
      switchClass: switchClass,
    },
    {
      label: widgetTranslations.textContent,
      accessor: 'textContent',
      required: selectedWidgetType?.value === 'Text',
      type:
        customInputs && customInputs['textContent'] ? undefined : 'text',
      placeholder: widgetTranslations.textContentPlaceholder,
      validations: {
        required: widgetTranslations.textContentRequired,
      },
      info: widgetTranslations.textContentInfo,
      show: selectedWidgetType?.value === 'Text',
      Input:
        customInputs && customInputs['textContent']
          ? customInputs['textContent']
          : undefined,
    },
    {
      label: widgetTranslations.itemsType,
      required: true,
      editable: false,
      show: selectedWidgetType?.value !== 'Text',
      accessor: constants.itemTypeAccessor,
      type: 'select',
      validations: {
        required: widgetTranslations.itemsTypePlaceholder,
      },
      options:
        selectedWidgetType?.value === constants.tabsWidgetTypeValue ||
        selectedWidgetType?.collectionsOnly
          ? itemsTypes.filter((item) => item.label !== constants.imageItemsTypeValue)
          : selectedWidgetType?.imageOnly
          ? itemsTypes.filter((item) => item.label === constants.imageItemsTypeValue)
          : itemsTypes,
    },
    {
      label: widgetTranslations.color,
      accessor: 'backgroundColor',
      type: 'color',
      className: 'khb_input-color',
    },
    {
      label: widgetTranslations.webPerRow,
      accessor: 'webPerRow',
      type: 'number',
      show: selectedWidgetType?.value !== 'Text',
      required: true,
      placeholder: widgetTranslations.webPerRowPlaceholder,
      wrapperClassName: 'khb_grid-item-1of3 khb_padding-right-1',
      validations: {
        required: widgetTranslations.webPerRowRequired,
        min: {
          value: 1,
          message: widgetTranslations.minPerRow,
        },
      },
    },
    {
      label: widgetTranslations.tabletPerRow,
      accessor: 'tabletPerRow',
      type: 'number',
      show: selectedWidgetType?.value !== 'Text',
      required: true,
      placeholder: widgetTranslations.tabletPerRowPlaceholder,
      wrapperClassName: 'khb_grid-item-1of3 khb_padding-left-1',
      validations: {
        required: widgetTranslations.tabletPerRowRequired,
        min: {
          value: 1,
          message: widgetTranslations.minPerRow,
        },
      },
    },
    {
      label: widgetTranslations.mobilePerRow,
      accessor: 'mobilePerRow',
      type: 'number',
      show: selectedWidgetType?.value !== 'Text',
      required: true,
      placeholder: widgetTranslations.mobilePerRowPlaceholder,
      wrapperClassName:
        'khb_grid-item-1of3 khb_padding-right-1 khb_padding-left-1',
      validations: {
        required: widgetTranslations.mobilePerRowRequired,
        min: {
          value: 1,
          message: widgetTranslations.minPerRow,
        },
      },
    },
    {
      label: selectedCollectionType?.label,
      placeholder: `Select ${selectedCollectionType?.label}...`,
      accessor: constants.collectionItemsAccessor,
      type: 'ReactSelect',
      options: collectionData,
      selectedOptions: selectedCollectionItems,
      isMulti: true,
      isSearchable: true,
      onChange: setSelectedCollectionItems,
      loadOptions: onChangeSearch,
      isLoading: collectionDataLoading,
      show: !itemsEnabled && (selectedWidgetType?.value === constants.carouselWidgetTypeValue || selectedWidgetType?.value === constants.fixedCardWidgetTypeValue),
      formatOptionLabel: formatOptionLabel,
      listCode: selectedCollectionType?.value,
      customStyles: reactSelectStyles || {},
      selectKey: selectedCollectionType?.value,
    },
  ];

  if (!canAdd || !canUpdate) return null;
  return (
    <div className="khb_form">
      <SimpleForm
        schema={widgetFormSchema}
        onSubmit={onFormSubmit}
        ref={formRef}
        isUpdating={formState === 'UPDATE'}
        register={register}
        errors={errors}
        handleSubmit={handleSubmit}
        setValue={setValue}
        control={control}
        setError={setError}
        languages={languages}
      />

      {selectedWidgetType?.value === constants.tabsWidgetTypeValue ? (
        <Tabs
          clearErrors={clearErrors}
          getValues={getValues}
          setValue={setValue}
          control={control}
          languages={languages}
          deleteTitle={widgetTranslations.tabDeleteTitle}
          yesButtonText={commonTranslations.yes}
          noButtonText={commonTranslations.cancel}
          errors={errors}
          itemsPlaceholder={`Select ${selectedCollectionType?.label}...`}
          loadOptions={onChangeSearch}
          isItemsLoading={collectionDataLoading}
          formatOptionLabel={formatOptionLabel}
          listCode={selectedCollectionType?.value || ''}
          onCollectionItemsIndexChange={onTabItemsIndexChange}
          tabCollectionItems={tabCollectionItems}
          formatItem={formatListItem}
          customStyles={reactSelectStyles || {}}
          activeTab={activeTab}
          setActiveTab={setActiveTab}
        />
      ) : null}

      {!itemsEnabled && selectedWidgetType?.value !== constants.tabsWidgetTypeValue && (
        <DNDItemsList
          items={selectedCollectionItems}
          onDragEnd={onCollectionIndexChange}
          formatItem={formatListItem}
          listCode={selectedCollectionType?.value}
        />
      )}

      {itemsEnabled && (selectedCollectionType === undefined) && (
        <>
          {/* Web Items */}
          <ItemsAccordian
            languages={languages}
            clearError={clearErrors}
            collapseId={constants.webItems}
            title={widgetTranslations.webItems}
            id={constants.webItems}
            setError={setError}
            show={webItemsVisible || !!(errors && errors?.[constants.webItems])}
            toggleShow={setWebItemsVisible}
            itemType="Web"
            name={constants.webItems}
            errors={errors}
            control={control}
            register={register}
            loading={loading}
            addText={commonTranslations.add}
            deleteText={commonTranslations.delete}
          />

          {/* Mobile Items */}
          <ItemsAccordian
            languages={languages}
            clearError={clearErrors}
            collapseId={constants.mobileItems}
            title={widgetTranslations.mobileItems}
            id={constants.mobileItems}
            name={constants.mobileItems}
            setError={setError}
            loading={loading}
            show={
              mobileItemsVisible ||
              !!(errors && errors?.[constants.mobileItems])
            }
            toggleShow={setMobileItemsVisible}
            itemType="Mobile"
            errors={errors}
            control={control}
            register={register}
            addText={commonTranslations.add}
            deleteText={commonTranslations.delete}
          />
        </>
      )}
    </div>
  );
};

export default WidgetForm;
