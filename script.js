// Вспомогательная функция debounce
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
};

document.addEventListener('DOMContentLoaded', () => {


    // --- Глобальные переменные и ссылки на DOM ---
    const resumeContainer = document.getElementById('resumeToExport');
    const textEditorToolbar = document.getElementById('text-editor-toolbar');
    const fontNameSelect = document.getElementById('fontNameSelect');
    const fontSizeInput = document.getElementById('fontSizeInput'); // Получаем инпут размера
    const fontSizeDisplay = document.getElementById('fontSizeDisplay'); // Убедитесь, что эта переменная доступна
    const decreaseFontSizeBtn = document.getElementById('decreaseFontSizeBtn');
    const increaseFontSizeBtn = document.getElementById('increaseFontSizeBtn');
    const foreColorInput = document.getElementById('foreColorInput'); // Получаем инпут цвета
    const applyColorBtn = document.getElementById('applyColorBtn'); // Получаем кнопку цвета
    const lineHeightSelect = document.getElementById('lineHeightSelect'); // 
    const printPdfBtn = document.getElementById('printPdfBtn'); // Get the new button


    // Модальное окно иконок
    const iconPickerModal = document.getElementById('iconPickerModal');
    const iconPickerList = document.getElementById('iconPickerList');

    // --- Variables for Section Management ---
    const addSectionButtonTemplate = document.getElementById('addSectionButtonTemplate'); 
    let sectionToDelete = null; 


    let currentContactIconBtn = null; // Хранит кнопку контакта, для которой выбирается иконка
    let blockToDelete = null; // Хранит блок, который нужно удалить
    // --- Глобальная переменная для хранения последнего валидного выделения ---
    let savedRange = null;

    // --- Ссылки на элементы модального окна подтверждения удаления ---
    const deleteConfirmModal = document.getElementById('deleteConfirmModal');
    const confirmDeleteBtn = document.getElementById('confirmDeleteBtn');
    const cancelDeleteBtn = document.getElementById('cancelDeleteBtn');
    const closeDeleteModalBtn = document.getElementById('closeDeleteModal'); // Крестик

    // --- Ссылки на элементы модального окна ввода URL ---
    const urlInputModal = document.getElementById('urlInputModal');
    const urlInput = document.getElementById('urlInput');
    const confirmUrlBtn = document.getElementById('confirmUrlBtn');
    const cancelUrlBtn = document.getElementById('cancelUrlBtn');
    const closeUrlModalBtn = document.getElementById('closeUrlModal'); // Крестик


    // --- Список доступных шрифтов ---
    // Ключ - то, что пойдет в execCommand('fontName', value)
    // Значение - то, что будет отображаться в dropdown
    // CSS переменные (--font-...) используются для стилизации самих опций в dropdown
    const availableFonts = {
        "Arial": { label: "Arial", cssVar: "var(--font-arial)" },
        "Verdana": { label: "Verdana", cssVar: "var(--font-verdana)" },
        "Times New Roman": { label: "Times New Roman", cssVar: "var(--font-times)" },
        "Georgia": { label: "Georgia", cssVar: "var(--font-georgia)" },
        "Courier New": { label: "Courier New", cssVar: "var(--font-courier)" },
        "Roboto": { label: "Roboto (Google)", cssVar: "var(--font-roboto)" },
        "Open Sans": { label: "Open Sans (Google)", cssVar: "var(--font-open-sans)" },
        "Lato": { label: "Lato (Google)", cssVar: "var(--font-lato)" },
        "Montserrat": { label: "Montserrat (Google)", cssVar: "var(--font-montserrat)" },
        "Merriweather": { label: "Merriweather (Google)", cssVar: "var(--font-merriweather)" },
        "Playfair Display": { label: "Playfair Display (Google)", cssVar: "var(--font-playfair)" },
    };


    // --- НАЧАЛО: Инициализация Rangy и помощники для размера шрифта ---
    let fontSizeAppliers = {}; // Кэш для созданных аппликаторов Rangy
    // Массив поддерживаемых размеров (можно настроить, если не нужны все 72)
    // Этот массив используется для определения шага +/-
    const supportedFontSizes = [];
    for (let i = 1; i <= 72; i++) { // Генерируем от 8 до 72 (или ваш диапазон)
        supportedFontSizes.push(i);
    }
    // Добавим меньшие размеры, если нужно
    // supportedFontSizes.unshift(1, 2, 3, 4, 5, 6, 7); // Раскомментируйте, если нужны размеры < 8px

    // Массив ВСЕХ возможных имен классов (1-72) для легкой очистки
    const allFontSizeClasses = [];
    for (let i = 1; i <= 72; i++) {
        allFontSizeClasses.push(`font-size-${i}`);
    }


    /**
     * Получает или создает Rangy CSS Class Applier для заданного размера шрифта.
     * @param {number} size - Размер шрифта в пикселях (1-72).
     * @returns {object|null} Rangy Class Applier или null, если Rangy недоступен.
     */
    function getFontSizeClassApplier(size) {
        if (typeof rangy === 'undefined' || !rangy.createClassApplier) {
            console.error("Rangy или CSS Class Applier модуль не найдены.");
            return null;
        }
        const className = `font-size-${size}`;
        if (!fontSizeAppliers[className]) {
             try {
                 fontSizeAppliers[className] = rangy.createClassApplier(className, {
                    elementTagName: "span", // Оборачивать в <span>
                     // Используем ignoreWhiteSpace: false (по умолчанию), чтобы пробелы тоже оборачивались
                     normalize: true // Попытаться объединить соседние <span> с одинаковым классом
                 });
             } catch (e) {
                  console.error(`Ошибка создания Rangy Class Applier для класса ${className}:`, e);
                  return null;
             }
        }
        return fontSizeAppliers[className];
    }
    // --- КОНЕЦ: Инициализация Rangy и помощники для размера шрифта ---


       // --- Инициализация ---
       populateFontDropdown(fontNameSelect, "Шрифт");

    // --- Функция для заполнения селекта шрифтов ---
    function populateFontDropdown(selectElement, defaultOptionText = "Font") {
       if (!selectElement) return;
       selectElement.innerHTML = `<option value="">${defaultOptionText}</option>`; // Очищаем и добавляем дефолт

       for (const fontValue in availableFonts) {
           const fontData = availableFonts[fontValue];
           const option = document.createElement('option');
           option.value = fontValue;
           option.textContent = fontData.label;
           option.style.fontFamily = fontData.cssVar; // Применяем стиль к опции
           selectElement.appendChild(option);
       }
   }

   // --- НОВЫЙ БЛОК: Инициализация контролов в УЖЕ СУЩЕСТВУЮЩИХ секциях ---
      // (ШАГ 11) ВСТАВИТЬ ЭТОТ БЛОК ЗДЕСЬ
      console.log("[Init Start] Инициализация существующих секций...");
      document.querySelectorAll('.resume-section').forEach((section, index) => {
          console.log(`[Init Section ${index}] Начинаем инициализацию секции:`, section);
          // Инициализация шрифта
          const fontSelect = section.querySelector('.section-font-select');
          if (fontSelect) {
              let currentFont = window.getComputedStyle(section).fontFamily;
              currentFont = currentFont.split(',')[0].replace(/['"]/g, '').trim();
              console.log(`[Init Section ${index}] Текущий шрифт computed: ${currentFont}`);
              populateFontDropdown(fontSelect, "Section Font");

              let foundFont = false;
              if (availableFonts[currentFont]) {
                  fontSelect.value = currentFont;
                  foundFont = true;
              } else {
                   for(const key in availableFonts) {
                       if (availableFonts[key].label.toLowerCase() === currentFont.toLowerCase()) {
                           fontSelect.value = key;
                           foundFont = true;
                           break;
                       }
                   }
              }
              if (!foundFont || !fontSelect.value) {
                   fontSelect.value = "Arial"; // Фоллбэк
              }
              // Применяем шрифт ИЗ селекта (на случай если он отличается от computed)
              section.style.fontFamily = fontSelect.value;
              console.log(`[Init Section ${index}] Установлен шрифт селекта: "${fontSelect.value}"`);
          } else {
              console.warn(`[Init Section ${index}] Селект шрифта (.section-font-select) не найден.`);
          }

          // Инициализация цвета линии H2
          const h2ColorInput = section.querySelector('.section-h2-color');
          if (h2ColorInput) {
               section.style.setProperty('--section-h2-underline-color', h2ColorInput.value);
               console.log(`[Init Section ${index}] Установлен цвет H2: "${h2ColorInput.value}"`);
          } else {
               console.warn(`[Init Section ${index}] Инпут цвета H2 (.section-h2-color) не найден.`);
          }

          // Инициализация ширины колонок (только для двухколоночных)
          if (section.classList.contains('resume-section--two-column')) {
              console.log(`[Init Section ${index}] Это двухколоночная секция, ищем слайдер.`);
              const widthSlider = section.querySelector('.section-width-slider');
              const leftCol = section.querySelector('.column-left');
              const rightCol = section.querySelector('.column-right');
              const valueDisplay = section.querySelector('.section-width-value');
              if (widthSlider && leftCol && rightCol && valueDisplay) {
                  updateSectionColumnWidths(widthSlider.value, leftCol, rightCol, valueDisplay); // Вызываем функцию обновления
                  console.log(`[Init Section ${index}] Установлена ширина колонок ${widthSlider.value}%`);
              } else {
                   console.warn(`[Init Section ${index}] Не все элементы для слайдера ширины найдены (slider: ${!!widthSlider}, left: ${!!leftCol}, right: ${!!rightCol}, value: ${!!valueDisplay})`);
              }
          }

          // Инициализация Sortable для блоков ВНУТРИ этой секции
          console.log(`[Init Section ${index}] Инициализация внутреннего Sortable...`);
          initializeInnerSortable(section); // Эта функция должна быть определена

      }); // Конец forEach по секциям
      console.log("[Init End] Инициализация существующих секций завершена.");
      // --- КОНЕЦ НОВОГО БЛОКА ---

    // --- Инициализация SortableJS ---

    // 1. Sortable для перетаскивания СЕКЦИЙ внутри resumeToExport
    if (resumeContainer) {
        new Sortable(resumeContainer, {
            group: 'sections', // Group for sections themselves
            animation: 150,
            handle: '.drag-section-handle', // Drag sections by this handle
            draggable: '.draggable-section', // CSS class for draggable sections
            ghostClass: 'section-sortable-ghost', // Distinct ghost class for sections
            chosenClass: 'section-sortable-chosen', // Distinct chosen class
            dragClass: 'section-sortable-drag',   // Distinct drag class
            // Prevent starting drag when clicking other buttons within controls
            filter: '.section-controls button:not(.drag-section-handle), .add-section-placeholder',
            preventOnFilter: true, // Stop default action for filtered elements
            onEnd: function (evt) {
                // After dragging a section, update the "+" add buttons' positions
                updateAddSectionButtons();
                hideToolbar(); // Hide text toolbar just in case
            },
            onStart: () => {
                hideToolbar(); // Hide text toolbar when section drag starts
                closeAddSectionOptions(); // Close any open "+" button popups
            }
        });
    }

    // 2. Функция для инициализации Sortable для БЛОКОВ ВНУТРИ конкретной секции
    function initializeInnerSortable(sectionElement) {
         // Создаем ОДНУ дебаунс-функцию для этого набора Sortable-контейнеров
        const debouncedUpdateAddButtons = debounce(() => {
            console.log("   >> Debounced: Обновление кнопок '+' во время перетаскивания блока");
            updateAddSectionButtons();
        }, 150); // Задержка в мс (можно подбирать 100-250)
        const innerSortableOptions = {
            group: 'resume-blocks', // Blocks can be moved between any compatible container
            animation: 150,
             // Let blocks be dragged by default, but filter interactions below
            handle: '.resume-block', // Could use a specific handle if needed later
            draggable: '.draggable', // Class for draggable blocks
            ghostClass: 'block-sortable-ghost', // Distinct ghost class for blocks
            chosenClass: 'block-sortable-chosen',
            dragClass: 'block-sortable-drag',
            // IMPORTANT: Filter out contenteditable, inputs, and specific controls
            // to allow interaction without starting block drag.
            filter: '[contenteditable="true"], input, textarea, select, .block-controls button, .control-btn, .language-level-control, .logo-placeholder, .add-item-btn',
            preventOnFilter: false, // IMPORTANT: Let default actions (like editing, clicking buttons) happen on filtered elements
            onStart: () => {
                hideToolbar(); // Hide text toolbar when block drag starts
                closeAddSectionOptions(); // Close "+" popups
                closeAllSectionDropdowns();
             },
              onEnd: function (evt) {
                 // Обновляем позиции кнопок "+" после того, как блок "приземлился"
                 updateAddSectionButtons();
                 // Дополнительно: можно скрыть тулбар на всякий случай
                 hideToolbar();
             },

             // ---> ДОБАВЛЯЕМ/ИЗМЕНЯЕМ onMove <---
             onMove: function (evt) {
                 // Вызываем дебаунсированную функцию при каждом движении
                 debouncedUpdateAddButtons();

                 // Важно: onMove может использоваться для отмены перемещения (return false).
                 // Если нам не нужно ничего отменять, можно ничего не возвращать (или return true).
                 return true; // Разрешаем перемещение по умолчанию
             }
        };

        // Find potential containers for blocks WITHIN this section
        // Includes columns and the container used in full-width sections
        const blockContainers = sectionElement.querySelectorAll('.resume-column, .resume-full-width-container');

        blockContainers.forEach(container => {
            // Check if Sortable is already initialized to prevent duplicates
            if (!container.sortableInstance) {
                 // Store the instance on the element for future reference/checks
                 container.sortableInstance = new Sortable(container, innerSortableOptions);
                 console.log('Inner Sortable initialized for:', container);
            } else {
                 console.log('Inner Sortable already exists for:', container);
            }
        });
    }

    // --- START: Section Management Functions ---

    const addSectionOptionsPopupClass = 'add-section-options'; // CSS class for the popup


/**
     * Creates the HTML structure for a new resume section.
     * @param {string} type - 'two-column' or 'full-width'.
     * @returns {HTMLElement} The newly created section element.
     */
    function createSectionHTML(type = 'two-column') {
        const section = document.createElement('div');
        section.classList.add('resume-section', `resume-section--${type}`, 'draggable-section');
        // Устанавливаем начальные значения переменных CSS для секции
        section.style.setProperty('--section-h2-underline-color', 'var(--h2-underline-color)'); // Наследуем глобальный по умолчанию
        const initialFont = "Arial"; // Можете выбрать другой шрифт по умолчанию для новых секций
        section.style.fontFamily = initialFont;

        let innerContentHTML = '';
        // Генерируем уникальный ID для связи label и input внутри секции (хотя используем классы для JS)
        const uniqueIdSuffix = Date.now() + Math.random().toString(36).substring(2, 7);

        // --- Секционные контролы ---
        let sectionControlsHTML = `
            <div class="section-controls">
                <button class="control-btn drag-section-handle" title="Move section"><i class="fas fa-grip-vertical"></i></button>
                <button class="control-btn delete-section" title="Delete section"><i class="fas fa-trash-alt"></i></button>

                <!-- Add Block Dropdown -->
                <div class="dropdown section-dropdown">
                    <button class="control-btn section-add-block-btn dropdown-toggle" title="Add block to this section"><i class="fas fa-plus"></i> <span class="control-label">Block</span></button>
                    <div class="dropdown-menu section-add-block-dropdown">
                        <button data-block-type="name">Name & Title</button>
                        <button data-block-type="contact">Contact</button>
                        <button data-block-type="about">About Me</button>
                        <button data-block-type="experience">Experience</button>
                        <button data-block-type="education">Education</button>
                        <button data-block-type="skills">Skills</button>
                        <button data-block-type="languages">Languages</button>
                        <button data-block-type="other">Other</button>
                        <button data-block-type="custom">Custom Block</button>
                    </div>
                </div>

                <!-- Section Font Selection -->
                <select class="control-select section-font-select" title="Section font">
                    <!-- Options added by JS -->
                </select>

                <!-- Section H2 Line Color -->
                <div class="control-subgroup" title="Section H2 line color">
                    <label for="h2Color_${uniqueIdSuffix}">H2:</label>
                    <input type="color" id="h2Color_${uniqueIdSuffix}" class="control-color section-h2-color" value="#4a90e2">
                </div>`;

        if (type === 'two-column') {
            // Add slider only for two-column layout
            sectionControlsHTML += `
                <div class="control-subgroup range-control" title="Left column width">
                    <label for="widthSlider_${uniqueIdSuffix}">L:</label>
                    <input type="range" id="widthSlider_${uniqueIdSuffix}" class="control-range section-width-slider" min="20" max="80" value="50" step="1">
                    <span class="control-value section-width-value">50%</span>
                </div>`;

            // Inner content for two columns
            innerContentHTML = `
                <div class="resume-columns-container">
                    <div class="resume-column column-left">
                        <!-- Default block can be added if needed -->
                        <!-- ${createBlockByType('custom')?.outerHTML || '<p>Add content...</p>'} -->
                    </div>
                    <div class="resume-column column-right"></div>
                </div>`;
        } else { // 'full-width'
            innerContentHTML = `
                <div class="resume-full-width-container" style="min-height: 50px;">
                     <!-- Default block can be added if needed -->
                     <!-- ${createBlockByType('custom')?.outerHTML || '<p>Add content...</p>'} -->
                </div>`;
        }

        sectionControlsHTML += `</div>`; // Закрываем .section-controls

        // Собираем секцию
        section.innerHTML = sectionControlsHTML + innerContentHTML;

        // --- Инициализация контролов новой секции ---
        const fontSelect = section.querySelector('.section-font-select');
        if (fontSelect) {
            // ВАЖНО: Передаем правильный текст по умолчанию
            populateFontDropdown(fontSelect, "Шрифт секции");
            fontSelect.value = initialFont; // Устанавливаем начальное значение
        }

        return section;
    }

    /**
     * Removes old "+" buttons and inserts new ones between/around sections,
     * positioning them absolutely to the side.
     */
    function updateAddSectionButtons() {
        if (!addSectionButtonTemplate || !resumeContainer) return;

        // 1. Remove all existing "+" placeholders
        resumeContainer.querySelectorAll('.add-section-placeholder').forEach(placeholder => placeholder.remove());

        // 2. Get all current DIRECT children sections within the main container
        const sections = resumeContainer.querySelectorAll(':scope > .resume-section');
        const placeholderHeight = 28; // Примерная высота кнопки "+" для расчета центрирования

        // 3. Add a "+" button BEFORE the first section
        const firstButtonFragment = addSectionButtonTemplate.content.cloneNode(true);
        const firstPlaceholder = firstButtonFragment.querySelector('.add-section-placeholder');
        if (!firstPlaceholder) return; // Safety check

        let nextElementTop = (sections.length > 0) ? sections[0].offsetTop : 0; // Top of first section or 0
        // Позиционируем первую кнопку чуть выше начала первой секции (или верха контейнера)
        firstPlaceholder.style.top = Math.max(0, nextElementTop - placeholderHeight / 2 - 5) + 'px'; // Центрируем в "верхнем" промежутке

        if (sections.length > 0) {
            resumeContainer.insertBefore(firstPlaceholder, sections[0]);
        } else {
            resumeContainer.appendChild(firstPlaceholder); // Add to empty container
            firstPlaceholder.style.top = '10px'; // Просто отступ сверху, если нет секций
        }

        // 4. Add a "+" button AFTER each section (positioned relative to the GAP between sections)
        sections.forEach((section, index) => {
            const buttonFragment = addSectionButtonTemplate.content.cloneNode(true);
            const placeholder = buttonFragment.querySelector('.add-section-placeholder');
            if (!placeholder) return;

            const sectionBottom = section.offsetTop + section.offsetHeight;
            const nextSection = sections[index + 1];
            const nextSectionTop = nextSection ? nextSection.offsetTop : (sectionBottom + 20); // Estimate gap if last section

            // Calculate the vertical midpoint of the gap between this section and the next
            const gapCenter = sectionBottom + (nextSectionTop - sectionBottom) / 2;
            // Position the button centered in the gap
            placeholder.style.top = (gapCenter - placeholderHeight / 2) + 'px';

            // Insert the placeholder logically AFTER the current section
            section.parentNode.insertBefore(placeholder, section.nextSibling);
        });
    }
    /**
     * Closes all currently open "add section" option popups.
     */
    function closeAddSectionOptions() {
        document.querySelectorAll(`.${addSectionOptionsPopupClass}.show`).forEach(popup => {
            popup.classList.remove('show');
        });
    }

    /**
     * Removes a specified section element with animation.
     * @param {HTMLElement} sectionElement - The section element to remove.
     */
    function removeSection(sectionElement) {
         if (!sectionElement || !sectionElement.parentNode) return;

         // Apply styles for fade-out and collapse animation
         sectionElement.style.transition = 'opacity 0.3s ease-out, transform 0.3s ease-out, height 0.3s ease-out, padding 0.3s ease-out, margin 0.3s ease-out';
         sectionElement.style.opacity = '0';
         sectionElement.style.transform = 'scale(0.95)';
         sectionElement.style.height = '0px'; // Collapse height
         sectionElement.style.paddingTop = '0px';
         sectionElement.style.paddingBottom = '0px';
         sectionElement.style.marginTop = '0px';
         sectionElement.style.marginBottom = '0px'; // Remove margin too
         sectionElement.style.overflow = 'hidden'; // Prevent content spill

         setTimeout(() => {
             if (sectionElement.parentNode) {
                 sectionElement.remove();
             }
             updateAddSectionButtons(); // Update "+" buttons AFTER removal
             // Reset the global reference ONLY if it still points to this section
             if (sectionToDelete === sectionElement) {
                 sectionToDelete = null;
             }
         }, 300); // Match animation duration
    }

    // --- END: Section Management Functions ---


    // --- START: Event Listeners for Section Interactions ---

    if (resumeContainer) {
        // НОВЫЙ ОБРАБОТЧИК 'input' для контролов секций
        resumeContainer.addEventListener('input', (event) => {
            const target = event.target;
            console.log('[Input Event]', target);

            // 1. Слайдер ширины колонки секции
            if (target.matches('.section-width-slider')) {
                console.log('   - Слайдер ширины секции изменен');
                const section = target.closest('.resume-section.resume-section--two-column');
                if (!section) return;
                const leftCol = section.querySelector('.column-left');
                const rightCol = section.querySelector('.column-right');
                const valueDisplay = section.querySelector('.section-width-value');
                if (leftCol && rightCol && valueDisplay) {
                    updateSectionColumnWidths(target.value, leftCol, rightCol, valueDisplay);
                } else { console.warn("Не найдены элементы для слайдера"); }
                return;
            }

            // 2. Цвет линии H2 секции
            if (target.matches('.section-h2-color')) {
                 console.log('   - Цвет H2 секции изменен');
                const section = target.closest('.resume-section');
                if (section) {
                    section.style.setProperty('--section-h2-underline-color', target.value);
                }
                 return;
            }
        }); // Конец обработчика 'input'

        // НОВЫЙ ОБРАБОТЧИК 'change' для контролов секций и лого
        resumeContainer.addEventListener('change', (event) => {
            const target = event.target;
             console.log('[Change Event]', target);

             // 3. Выбор шрифта секции
             if (target.matches('.section-font-select')) {
                 console.log('   - Шрифт секции изменен');
                const section = target.closest('.resume-section');
                const selectedFont = target.value;
                if (section) {
                    if (selectedFont && availableFonts[selectedFont]) {
                        section.style.fontFamily = selectedFont;
                    } else {
                        section.style.fontFamily = ''; // Сброс
                    }
                }
                return;
             }

             // 4. Загрузка Логотипа (ОСТАВИТЬ ЭТОТ БЛОК)
             if (target.classList.contains('logo-input') && target.files && target.files[0]) {
                 console.log('   - Файл логотипа выбран');
                 const input = target;
                 const file = input.files[0];
                 const placeholder = closest(input, '.logo-placeholder');
                 if (!placeholder) return;
                 const img = placeholder.querySelector('.logo-image');
                 const iconPlaceholder = placeholder.querySelector('.logo-icon-placeholder');
                 if (!img) return;
                 const reader = new FileReader();
                 reader.onload = (e) => {
                     img.src = e.target.result;
                     img.style.display = 'block';
                     if (iconPlaceholder) iconPlaceholder.style.display = 'none';
                     placeholder.style.borderStyle = 'solid';
                 }
                  reader.onerror = (e) => { console.error("Ошибка чтения файла:", e); alert("Не удалось загрузить изображение."); }
                 reader.readAsDataURL(file);
                 return; // Важно выйти, т.к. change сработало
             }
        }); // Конец обработчика 'change'

       // МОДИФИЦИРОВАННЫЙ ОБРАБОТЧИК 'click' (добавлены/сгруппированы проверки)
             resumeContainer.addEventListener('click', (event) => {
                 const target = event.target;
                  console.log('[Click Event]', target);

                 // --- Управление Добавлением Блока в Секции ---
                 const addBlockToggleBtn = target.closest('.section-add-block-btn');
                 if (addBlockToggleBtn) {
                     console.log('  - Клик по кнопке добавления блока секции');
                     event.preventDefault();
                     event.stopPropagation();
                     const dropdownMenu = addBlockToggleBtn.closest('.section-dropdown')?.querySelector('.section-add-block-dropdown');
                     if (dropdownMenu) {
                         const isShown = dropdownMenu.classList.contains('show');
                         closeAllSectionDropdowns(); // Закрыть другие
                         if (!isShown) dropdownMenu.classList.add('show'); // Открыть/закрыть текущий
                     }
                     return;
                 }
                 const blockTypeBtn = target.closest('.section-add-block-dropdown button[data-block-type]');
                 if (blockTypeBtn) {
                      console.log('  - Клик по типу блока в дропдауне секции');
                     event.preventDefault();
                     const section = blockTypeBtn.closest('.resume-section');
                     const dropdownMenu = blockTypeBtn.closest('.section-add-block-dropdown');
                     if (section && dropdownMenu) {
                         const type = blockTypeBtn.dataset.blockType;
                         const newBlock = createBlockByType(type);
                         if (newBlock) {
                             let targetContainer = section.querySelector('.resume-full-width-container') ||
                                                   section.querySelector('.column-left') || // Ищем сначала левую
                                                   section.querySelector('.column-right'); // Потом правую
                             // Если обе колонки есть, выбираем ту, где меньше блоков
                             const leftCol = section.querySelector('.column-left');
                             const rightCol = section.querySelector('.column-right');
                             if (leftCol && rightCol) {
                                 targetContainer = (leftCol.children.length <= rightCol.children.length) ? leftCol : rightCol;
                             }

                             if (targetContainer) {
                                 targetContainer.appendChild(newBlock);
                                 // Эффекты
                                 newBlock.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                 newBlock.style.opacity = '0';
                                 newBlock.style.transition = 'opacity 0.5s ease-in';
                                 setTimeout(() => newBlock.style.opacity = '1', 50);
                                  console.log(`  - Блок типа "${type}" добавлен в`, targetContainer);

                                setTimeout(() => {
                                    updateAddSectionButtons();
                                    console.log('Кнопки "+" обновлены после добавления блока');
                                    }, 50);
                             } else { console.error("Не найден контейнер для добавления блока в секции:", section); }
                         }
                          dropdownMenu.classList.remove('show');
                     }
                     return;
                 }

                 // --- Управление Добавлением/Удалением Секций ---
                 const addSectionBtn = target.closest('.add-section-btn');
                 if (addSectionBtn) { // ОСТАВИТЬ
                      console.log('  - Клик по кнопке добавления секции (+)');
                     event.preventDefault(); event.stopPropagation();
                     const placeholder = addSectionBtn.closest('.add-section-placeholder');
                     if (!placeholder) return;
                     const optionsPopup = placeholder.querySelector(`.${addSectionOptionsPopupClass}`);
                     if (!optionsPopup) return;
                     const isAlreadyShown = optionsPopup.classList.contains('show');
                     closeAddSectionOptions();
                     if (!isAlreadyShown) optionsPopup.classList.add('show');
                     return;
                 }
                 const typeBtn = target.closest(`.${addSectionOptionsPopupClass} button[data-section-type]`);
                 if (typeBtn) { // ОСТАВИТЬ
                      console.log('  - Клик по типу добавляемой секции');
                     event.preventDefault();
                     const placeholder = typeBtn.closest('.add-section-placeholder');
                     if (!placeholder) return;
                     const sectionType = typeBtn.dataset.sectionType;
                     const newSection = createSectionHTML(sectionType);
                     placeholder.parentNode.insertBefore(newSection, placeholder.nextSibling);
                     initializeInnerSortable(newSection); // ВАЖНО
                     closeAddSectionOptions();
                     updateAddSectionButtons();
                     // Эффекты
                     newSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
                     newSection.style.opacity = '0'; newSection.style.transition = 'opacity 0.5s ease-in';
                     setTimeout(() => { newSection.style.opacity = '1'; }, 50);
                     return;
                 }
                 const deleteSectionBtn = target.closest('.section-controls .delete-section');
                 if (deleteSectionBtn) {
                     console.log('  - Клик по кнопке удаления секции');
                     event.preventDefault();
                     const section = deleteSectionBtn.closest('.resume-section');
                     if (section) {
                         sectionToDelete = section;
                         if (deleteConfirmModal) {
                             const modalText = deleteConfirmModal.querySelector('p');
                             // --- UPDATE HERE ---
                             if (modalText) modalText.textContent = "Are you sure you want to delete this section and all its content?";
                             // --- END UPDATE ---
                             deleteConfirmModal.style.display = 'block';
                         } else { /* fallback confirm */ if (confirm('Are you sure?')) { removeSection(section); } sectionToDelete = null; }
                     }
                     return;
                 }

                 // --- Управление Блоками (Удаление, Скрытие заголовка) ---
                 const deleteBlockBtn = target.closest('.block-controls .delete-block');
                 if (deleteBlockBtn) {
                     console.log('  - Клик по кнопке удаления блока');
                     event.preventDefault();
                     const block = deleteBlockBtn.closest('.resume-block');
                     if (block) {
                         blockToDelete = block;
                         if (deleteConfirmModal) {
                             const modalText = deleteConfirmModal.querySelector('p');
                              // --- UPDATE HERE ---
                             if (modalText) modalText.textContent = "Are you sure you want to delete this block?";
                              // --- END UPDATE ---
                             deleteConfirmModal.style.display = 'block';
                         } else { /* fallback confirm */ if (confirm('Are you sure?')) { if(block.parentNode) block.remove(); } blockToDelete = null; }
                     }
                     return;
                 }
                 const toggleTitleBtn = target.closest('.block-controls .toggle-title');
                 if (toggleTitleBtn) { // ОСТАВИТЬ
                      console.log('  - Клик по кнопке скрытия/показа заголовка блока');
                      const block = toggleTitleBtn.closest('.resume-block');
                      if (block) {
                         const titleElement = block.querySelector('h2');
                         if (titleElement) {
                             block.classList.toggle('title-hidden');
                             toggleTitleBtn.classList.toggle('active', block.classList.contains('title-hidden'));
                         } else { console.warn("Заголовок H2 не найден в блоке для toggle."); }
                      }
                      return;
                 }

                  // --- Управление Контактами ---
                  const changeIconButton = target.closest('.change-icon-btn');
                  if (changeIconButton) { // ОСТАВИТЬ
                       console.log('  - Клик по кнопке смены иконки контакта');
                      currentContactIconBtn = changeIconButton;
                      populateIconPicker();
                      showElement(iconPickerModal);
                      return;
                  }
                  const addContactButton = target.closest('.add-contact-btn');
                  if (addContactButton) { // ОСТАВИТЬ
                      console.log('  - Клик по кнопке добавления контакта');
                      const container = addContactButton.previousElementSibling;
                      if (container && container.matches('#contact-list-container')) {
                           const newItem = createContactItem();
                           container.appendChild(newItem);
                           // Эффекты
                           newItem.style.opacity = '0'; newItem.style.transition = 'opacity 0.3s ease-in';
                           setTimeout(() => newItem.style.opacity = '1', 10);
                      }
                      return;
                  }
                  const deleteContactButton = target.closest('.delete-contact');
                  if (deleteContactButton) { // ОСТАВИТЬ
                       console.log('  - Клик по кнопке удаления контакта');
                      const contactItem = closest(deleteContactButton, '.contact-item');
                      if (contactItem) {
                          contactItem.style.transition = 'opacity 0.3s ease-out'; contactItem.style.opacity = '0';
                          setTimeout(() => contactItem.remove(), 300);
                      }
                      return;
                  }

                 // --- Управление Языками ---
                 const addLangButton = target.closest('.add-language-btn');
                 if (addLangButton) { // ОСТАВИТЬ
                      console.log('  - Клик по кнопке добавления языка');
                     const langList = closest(target, '.resume-block')?.querySelector('#language-list');
                     if (langList) {
                         const newItem = createLanguageItem();
                         langList.appendChild(newItem);
                         // Эффекты
                          newItem.style.opacity = '0'; newItem.style.transition = 'opacity 0.3s ease-in';
                          setTimeout(() => newItem.style.opacity = '1', 10);
                     }
                     return;
                 }
                 const langItem = closest(target, '.language-item'); // Ищем родителя .language-item
                 if (langItem) {
                      const deleteLangButton = target.closest('.delete-language');
                      if (deleteLangButton) { // ОСТАВИТЬ
                           console.log('  - Клик по кнопке удаления языка');
                           langItem.style.transition = 'opacity 0.3s ease-out'; langItem.style.opacity = '0';
                           setTimeout(() => langItem.remove(), 300);
                          return;
                      }
                      const levelDot = target.closest('.level-dot'); // Проверяем клик на точке уровня
                      if (levelDot) { // ОСТАВИТЬ
                           console.log('  - Клик по точке уровня языка');
                           const levelControl = closest(target, '.language-level-control');
                           if(levelControl) {
                               const dots = Array.from(levelControl.querySelectorAll('.level-dot'));
                               const dotIndex = dots.indexOf(levelDot); // levelDot здесь точно не null
                               const currentLevel = parseInt(levelControl.dataset.level || '0');
                               const newLevel = (dotIndex + 1 === currentLevel) ? 0 : dotIndex + 1;
                               levelControl.dataset.level = newLevel;
                               dots.forEach((dot, index) => dot.classList.toggle('filled', index < newLevel));
                           }
                          return;
                      }
                 }

                 // --- Управление Опытом --- 
                  const addExperienceBtn = target.closest('.add-experience-item-btn');
                  if (addExperienceBtn) {
                      console.log('  - Клик по кнопке добавления опыта');
                      event.preventDefault();
                      const block = addExperienceBtn.closest('.experience-block');
                      if (block) {
                          const newItemHtml = createExperienceItemHTML(); // Create new item HTML
                          const tempDiv = document.createElement('div');
                          tempDiv.innerHTML = newItemHtml;
                          const newItemElement = tempDiv.firstElementChild; // Get the element itself
                          // Find container: could be the block itself if items are direct children, or a specific container div

                          if (newItemElement) { // Check if element creation succeeded
                               // *** FIX START: Add the delete button to the new experience item ***
                               const header = newItemElement.querySelector('.experience-header');
                               if (header && !header.querySelector('.delete-experience-item')) { // Check if not already present
                                   const deleteBtn = document.createElement('button');
                                   deleteBtn.className = 'control-btn delete-item delete-experience-item';
                                   deleteBtn.title = 'Delete Сompany'; // Or 'Удалить компанию'
                                   deleteBtn.innerHTML = '<i class="fas fa-times"></i>';
                                   header.appendChild(deleteBtn);
                                   console.log("   - Added delete button to new experience item header.");
                               } else if (!header) {
                                    console.warn("   - Could not find .experience-header in new item to add delete button.");
                               }
                               // *** FIX END ***

                                // Find container: could be the block itself if items are direct children, or a specific container div
                               const itemsContainer = block.querySelector('.experience-items-container') || block; // Adjust selector if you have a specific container
                               itemsContainer.appendChild(newItemElement);

                               // Optional: Add animation
                               newItemElement.style.opacity = '0'; newItemElement.style.transition = 'opacity 0.3s ease-in';
                               setTimeout(() => newItemElement.style.opacity = '1', 10);
                               newItemElement.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                          } else {
                                console.error("   - Failed to create experience item element from HTML string.");
                          }
                      }
                      return;
                  }
                  const deleteExperienceBtn = target.closest('.delete-experience-item');
                  if (deleteExperienceBtn) {
                      console.log('  - Клик по кнопке удаления элемента опыта');
                      event.preventDefault();
                      const item = deleteExperienceBtn.closest('.experience-item');
                      if (item) {
                          item.style.transition = 'opacity 0.3s ease-out, height 0.3s ease-out, margin 0.3s ease-out, padding 0.3s ease-out';
                          item.style.opacity = '0';
                          item.style.height = '0px';
                          item.style.margin = '0';
                          item.style.padding = '0';
                          item.style.overflow = 'hidden';
                          setTimeout(() => item.remove(), 300);
                      }
                      return;
                  }


                 // --- Add Position within an Experience Item ---
                 const addPositionBtn = target.closest('.add-position-btn');
                  if (addPositionBtn) {
                      console.log('  - Клик по кнопке добавления позиции');
                      event.preventDefault();
                      const positionsList = addPositionBtn.closest('.experience-item')?.querySelector('.positions-list');
                      if (positionsList) {
                          // *** FIX: Create a temporary container to convert HTML string to DOM element ***
                          const newPositionEntryHtmlString = createPositionEntryHTML(); // Returns STRING
                          const tempDiv = document.createElement('div');
                          tempDiv.innerHTML = newPositionEntryHtmlString.trim(); // Parse the HTML string
                          const newPositionEntryElement = tempDiv.firstElementChild; // Get the actual DOM element

                          if (newPositionEntryElement) { // Check if element was successfully created
                               positionsList.appendChild(newPositionEntryElement); // Append the actual ELEMENT
                               console.log("   - Position entry element appended:", newPositionEntryElement);

                               // Optional: Animation
                               newPositionEntryElement.style.opacity = '0';
                               newPositionEntryElement.style.transition = 'opacity 0.3s ease-in';
                               setTimeout(() => newPositionEntryElement.style.opacity = '1', 10);
                               newPositionEntryElement.scrollIntoView({ behavior: 'smooth', block: 'nearest' });

                               // Optional: Focus new position span
                               const jobPositionSpan = newPositionEntryElement.querySelector('.job-position');
                               if (jobPositionSpan) {
                                    setTimeout(() => {
                                         // Ensure focus lands inside the contenteditable span
                                        const editableSpan = jobPositionSpan.querySelector('span[contenteditable="true"]');
                                        if (editableSpan) editableSpan.focus();
                                    }, 50);
                               }

                          } else {
                               console.error("   - Failed to create position entry element from HTML string.");
                          }
                      }
                      return;
                  }
                   // --- Delete Position within an Experience Item ---
                   const deletePositionBtn = target.closest('.delete-position-entry');
                    if (deletePositionBtn) {
                       console.log('  - Клик по кнопке удаления позиции');
                       event.preventDefault();
                       const positionEntry = deletePositionBtn.closest('.position-entry');
                        // Prevent deleting the last position entry? Optional.
                        // const siblings = positionEntry?.parentElement?.children.length;
                        // if (positionEntry && siblings > 1) { // Only delete if not the last one
                       if (positionEntry) { // Allow deleting the last one too
                           positionEntry.style.transition = 'opacity 0.3s ease-out, height 0.3s ease-out, margin 0.3s ease-out, padding 0.3s ease-out';
                           positionEntry.style.opacity = '0';
                           positionEntry.style.height = '0px';
                           positionEntry.style.margin = '0';
                           positionEntry.style.padding = '0';
                           positionEntry.style.overflow = 'hidden';
                           setTimeout(() => positionEntry.remove(), 300);
                       }
                       return;
                   }

                  // --- Управление Образованием --- NEW (Similar to Experience)
                  const addEducationBtn = target.closest('.add-education-item-btn');
                  if (addEducationBtn) {
                      console.log('  - Клик по кнопке добавления образования');
                      event.preventDefault();
                      const block = addEducationBtn.closest('.education-block');
                      if (block) {
                          const newItemHtml = createEducationItemHTML();
                          const tempDiv = document.createElement('div');
                          tempDiv.innerHTML = newItemHtml;
                          const newItemElement = tempDiv.firstElementChild;
                          if (newItemElement) { // Check if element creation succeeded
                              // *** FIX START: Add the delete button to the new education item ***
                              const header = newItemElement.querySelector('.education-header');
                              if (header && !header.querySelector('.delete-education-item')) { // Check if not already present
                                   const deleteBtn = document.createElement('button');
                                   deleteBtn.className = 'control-btn delete-item delete-education-item';
                                   deleteBtn.title = 'Delete Education'; // Or 'Удалить место учебы'
                                   deleteBtn.innerHTML = '<i class="fas fa-times"></i>';
                                   header.appendChild(deleteBtn);
                                   console.log("   - Added delete button to new education item header.");
                               } else if (!header) {
                                    console.warn("   - Could not find .education-header in new item to add delete button.");
                               }
                              // *** FIX END ***

                              const itemsContainer = block.querySelector('.education-items-container') || block; // Adjust selector if needed
                              itemsContainer.appendChild(newItemElement);
                              // Optional: Animation
                              newItemElement.style.opacity = '0'; newItemElement.style.transition = 'opacity 0.3s ease-in';
                              setTimeout(() => newItemElement.style.opacity = '1', 10);
                              newItemElement.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                          } else {
                               console.error("   - Failed to create education item element from HTML string.");
                          }
                      }
                      return;
                  }
                  const deleteEducationBtn = target.closest('.delete-education-item');
                  if (deleteEducationBtn) {
                      console.log('  - Клик по кнопке удаления элемента образования');
                      event.preventDefault();
                      const item = deleteEducationBtn.closest('.education-item');
                      if (item) {
                           item.style.transition = 'opacity 0.3s ease-out, height 0.3s ease-out, margin 0.3s ease-out, padding 0.3s ease-out';
                          item.style.opacity = '0';
                          item.style.height = '0px';
                          item.style.margin = '0';
                          item.style.padding = '0';
                           item.style.overflow = 'hidden';
                          setTimeout(() => item.remove(), 300);
                      }
                      return;
                  }

                 // --- Клик по плейсхолдеру логотипа ---
                  const logoPlaceholder = target.closest('.logo-placeholder');
                  if (logoPlaceholder) { // ОСТАВИТЬ
                       console.log('  - Клик по плейсхолдеру логотипа');
                      const input = logoPlaceholder.querySelector('.logo-input');
                      if (input) {
                          input.click(); // Открываем диалог выбора файла
                      }
                      return;
                  }

                 // --- Закрытие внешних меню при клике вне их ---
                 if (!target.closest('.add-section-placeholder')) { // ОСТАВИТЬ
                     closeAddSectionOptions();
                 }
                 // Закрытие дропдауна секции уже обработано выше (через closeAllSectionDropdowns)

             }); // Конец resumeContainer 'click' listener
    } // End of if (resumeContainer)

    // --- END: Event Listeners for Section Interactions ---


    // --- Общие Функции ---
    function hideElement(el) { if (el) el.style.display = 'none'; }
    function showElement(el, display = 'block') { if (el) el.style.display = display; }
    function closest(el, selector) {
        while (el) {
            if (el.matches && el.matches(selector)) return el;
            el = el.parentElement;
        }
        return null;
    }


    // --- Панель Редактирования Текста ---

    // Сохраняем последнее ВАЛИДНОЕ выделение в contenteditable
    document.addEventListener('selectionchange', () => {
        const selection = window.getSelection();
        // Сохраняем только если фокус НЕ внутри тулбара И есть выделение внутри contenteditable
        if (!textEditorToolbar.contains(document.activeElement) && selection.rangeCount > 0) {
            const range = selection.getRangeAt(0);
            if (closest(range.commonAncestorContainer.parentElement, '[contenteditable="true"]')) {
                 // Проверяем, что выделение не пустое (хотя toolbar и так не должен показываться для пустого)
                 if (!range.collapsed) {
                    savedRange = range.cloneRange();
                    // console.log("Saved range on selectionchange"); // Debug
                 }
            }
        }
    });

    // Показываем/позиционируем тулбар при выделении текста
    document.addEventListener('mouseup', handleTextSelection);
    document.addEventListener('keyup', handleTextSelection);

    // Скрываем тулбар при клике вне его, если нет выделения
    // Управляем фокусом при клике на тулбар
    document.addEventListener('mousedown', (event) => {
        const target = event.target;
        const isClickInsideToolbar = closest(target, '#text-editor-toolbar');
        const selection = window.getSelection();

        if (!isClickInsideToolbar && selection.isCollapsed) {
            hideToolbar();
        }

        // Предотвращаем потерю выделения при клике на ЭЛЕМЕНТЫ ВНУТРИ тулбара,
        // КРОМЕ input[type=color] и input[type=number], чтобы они могли получить фокус
        if (isClickInsideToolbar) {
             const parentToolbarElement = closest(target, 'button, input, select'); // Находим кликнутый элемент управления
             if (parentToolbarElement && !['INPUT', 'SELECT'].includes(parentToolbarElement.tagName)) {
                  // Это кнопка (bold, italic, applyColorBtn и т.д.)
                  event.preventDefault(); // Предотвращаем потерю фокуса/выделения
             }
             // Для INPUT и SELECT - НЕ предотвращаем, позволяем им получить фокус
        }
    });


    function handleTextSelection(event) {
            const target = event.target;
             // Игнорируем клики на контролы блока и элементы списков/иконок, лого
            if (closest(target, '.block-controls') ||
                closest(target, '.language-level-control') ||
                closest(target, '.delete-item') ||
                closest(target, '.change-icon-btn') ||
                closest(target, '.logo-placeholder') ||
                closest(target, '.level-dot') || // клики на точки языка
                closest(target, '.add-item-btn') // клики на кнопки добавления
                ) {
                 hideToolbar();
                 return;
             }

            // Не показываем тулбар если клик/keyup был внутри самого тулбара
            if (closest(target, '#text-editor-toolbar')) {
                return;
            }


            const selection = window.getSelection();
            if (selection.rangeCount > 0 && !selection.isCollapsed) {
                const range = selection.getRangeAt(0);
                // Find the common ancestor that is contenteditable
                let startEditable = closest(range.startContainer, '[contenteditable="true"]');
                let endEditable = closest(range.endContainer, '[contenteditable="true"]');

                // --- НАЧАЛО ЗАПРАШИВАЕМОГО БЛОКА ---
                // Show toolbar only if the selection starts AND ends within the SAME editable container
                if (startEditable && endEditable && startEditable === endEditable) {
                    // Определяем текущий редактируемый элемент, в котором находится выделение
                    const currentEditableElement = startEditable; // Используем найденный элемент

                    // Позиционируем и показываем тулбар
                    positionToolbar(range);
                    showElement(textEditorToolbar, 'flex');

                    // Обновляем состояние кнопок тулбара на основе стилей выделения
                    // Передаем сам редактируемый элемент для контекста
                    updateToolbarState(currentEditableElement);

                    // Обновляем сохраненное выделение
                    savedRange = range.cloneRange();
                     // console.log("Saved range on handleTextSelection (valid selection inside editable)"); // Debug
                } else {
                    // Если выделение есть, но не в одном editable или вне editable - скрываем тулбар
                    // console.log("Hiding toolbar: selection spans editables or is outside"); // Debug
                    hideToolbar();
                }
                // --- КОНЕЦ ЗАПРАШИВАЕМОГО БЛОКА ---

            } else {
                 // Если выделение схлопнуто или его нет - скрываем (если клик был не в тулбаре)
                 if (!closest(target, '#text-editor-toolbar')) {
                     // console.log("Hiding toolbar: selection collapsed or lost, click outside toolbar"); // Debug
                     hideToolbar();
                 }
            }
        }
    function positionToolbar(range) {
        const rect = range.getBoundingClientRect();
        const toolbarHeight = textEditorToolbar.offsetHeight || 40;
        const toolbarWidth = textEditorToolbar.offsetWidth || 300; // Может быть шире
        let top = window.scrollY + rect.top - toolbarHeight - 10;
        let left = window.scrollX + rect.left + (rect.width / 2) - (toolbarWidth / 2);

        // Коррекция позиции
        if (top < window.scrollY + 5) { // Не заходить за верхнюю границу окна + небольшой отступ
             top = window.scrollY + rect.bottom + 10;
        }
         if (left < window.scrollX + 5) { // Не заходить за левую границу
             left = window.scrollX + 5;
         }
         if (left + toolbarWidth > window.innerWidth - 5) { // Не заходить за правую границу
             left = window.innerWidth - toolbarWidth - 5;
         }

        textEditorToolbar.style.top = `${top}px`;
        textEditorToolbar.style.left = `${left}px`;
    }

    function hideToolbar() { hideElement(textEditorToolbar); }

    // --- РЕАЛИЗАЦИЯ: updateToolbarState Function ---
    /**
     * Обновляет состояние кнопок и контролов тулбара на основе форматирования текущего выделения.
     * @param {HTMLElement} editableElement - Элемент contenteditable, содержащий выделение.
     * @param {boolean} [skipFontSizeUpdate=false] - Если true, пропускает обновление отображения размера шрифта.
     */
    function updateToolbarState(editableElement, skipFontSizeUpdate = false) {
        if (!editableElement) {
            console.warn("[updateToolbarState] Не предоставлен editableElement.");
            return;
        }
        console.log("[updateToolbarState] Обновление тулбара для элемента:", editableElement, "Пропустить обновление размера шрифта:", skipFontSizeUpdate);

        // --- Команды форматирования (bold, italic, etc.) ---
        const commands = ['bold', 'italic', 'underline', 'strikeThrough', 'insertUnorderedList', 'insertOrderedList'];
        commands.forEach(cmd => {
            const button = textEditorToolbar.querySelector(`[data-command="${cmd}"]`);
            if (button) {
                try {
                    let isActive = document.queryCommandState(cmd);
                    // Дополнительная проверка для underline/strikethrough с использованием computed style как fallback
                     if ((cmd === 'underline' || cmd === 'strikeThrough') && !isActive) {
                        const selection = window.getSelection();
                        if (selection.rangeCount > 0) {
                            let container = selection.getRangeAt(0).commonAncestorContainer;
                            if (container.nodeType !== Node.ELEMENT_NODE) container = container.parentElement;
                            if (container && editableElement.contains(container)) {
                                 let currentElement = container;
                                 const prop = cmd === 'underline' ? 'textDecorationLine' : 'textDecorationLine'; // Может отличаться для strike
                                 const value = cmd === 'underline' ? 'underline' : 'line-through';
                                 while (currentElement && currentElement !== editableElement && !isActive) {
                                     const style = window.getComputedStyle(currentElement);
                                     if (style[prop] && style[prop].includes(value)) {
                                         isActive = true;
                                     }
                                     currentElement = currentElement.parentElement;
                                 }
                            }
                        }
                    }
                    button.classList.toggle('active', isActive);
                } catch (e) {
                    console.warn(`queryCommandState не удался для ${cmd}:`, e);
                    button.classList.remove('active');
                }
            }
        });

        // --- Цвет текста ---
        if (foreColorInput) {
            try {
                let colorValue = document.queryCommandValue('foreColor');
                let hexColor = rgbToHex(colorValue); // Конвертируем возможный RGB в HEX

                if (!hexColor || hexColor === '#000000') { // Если команда не удалась или вернула черный, проверяем computed style
                    const selection = window.getSelection();
                    if (selection.rangeCount > 0) {
                        let parent = selection.getRangeAt(0).commonAncestorContainer;
                        if (parent.nodeType !== Node.ELEMENT_NODE) parent = parent.parentElement;
                        // Убедимся, что родитель внутри editable перед получением стиля
                        if (parent && editableElement.contains(parent)) {
                            const computedColor = window.getComputedStyle(parent).color;
                            hexColor = rgbToHex(computedColor) || '#000000'; // Используем вычисленный или дефолтный черный
                        } else {
                            // Если родитель снаружи, проверяем цвет корневого editable элемента
                            const rootColor = window.getComputedStyle(editableElement).color;
                             hexColor = rgbToHex(rootColor) || '#000000';
                        }
                    } else {
                        hexColor = '#000000'; // Дефолт, если нет выделения
                    }
                }
                foreColorInput.value = hexColor;
            } catch (e) {
                console.warn("Не удалось определить цвет текста:", e);
                foreColorInput.value = '#000000'; // Дефолт при ошибке
            }
        }

        // --- Кнопка ссылки ---
        const linkButton = textEditorToolbar.querySelector(`[data-command="createLink"]`);
        if (linkButton) {
            const selection = window.getSelection();
            let isLink = false;
            if (selection.rangeCount > 0 && !selection.isCollapsed) {
                let container = selection.getRangeAt(0).commonAncestorContainer;
                if (container.nodeType === Node.TEXT_NODE) container = container.parentElement;
                // Проверяем, является ли сам контейнер или его предок до editable элементом ссылки
                const closestAnchor = container ? container.closest('a') : null;
                isLink = closestAnchor && editableElement.contains(closestAnchor);
            }
            linkButton.classList.toggle('active', isLink);
        }

        // --- Отображение Размера Шрифта ---
        if (!skipFontSizeUpdate && fontSizeDisplay) {
            console.log("   - Обновление Отображения Размера Шрифта...");
            let currentSizeText = '--px'; // Дефолт/плейсхолдер
            let foundSize = null;

            if (typeof rangy !== 'undefined' && rangy.getSelection) {
                try {
                    rangy.init();
                    const sel = rangy.getSelection();
                    if (sel.rangeCount > 0) {
                        const range = sel.getRangeAt(0);
                        // Определяем узел для начала поиска (используем startContainer)
                        let node = range.startContainer;
                        let searchElement = (node.nodeType === Node.ELEMENT_NODE) ? node : node.parentElement;
                        console.log("      - Начало DOM поиска с:", searchElement);

                        // 1. DOM Поиск Вверх: Ищем класс font-size-* на SPAN-ах
                        let domSearchNode = searchElement;
                        while (domSearchNode && editableElement.contains(domSearchNode) && !domSearchNode.hasAttribute('contenteditable')) {
                            if (domSearchNode.tagName === "SPAN" && domSearchNode.classList) {
                                for (const cls of domSearchNode.classList) {
                                    if (cls.startsWith("font-size-")) {
                                        const sizeMatch = cls.match(/font-size-(\d+)/);
                                        if (sizeMatch && sizeMatch[1]) {
                                            foundSize = parseInt(sizeMatch[1], 10);
                                            console.log(`      - Найден класс ${cls} (размер ${foundSize}px) через DOM поиск.`);
                                            break; // Найден самый внутренний класс размера
                                        }
                                    }
                                }
                            }
                            if (foundSize !== null) break; // Прекращаем поиск вверх, если нашли
                            domSearchNode = domSearchNode.parentElement;
                        }

                        // 2. Fallback на Computed Style, если класс не найден
                        if (foundSize === null) {
                            console.log("      - Класс font-size-* не найден через DOM. Используем computedStyle.");
                            if (searchElement && editableElement.contains(searchElement)) {
                                 const computedStyle = window.getComputedStyle(searchElement);
                                 const sizePxStr = computedStyle.fontSize;
                                 if (sizePxStr && sizePxStr.endsWith('px')) {
                                     const sizeNum = parseFloat(sizePxStr);
                                     if (!isNaN(sizeNum)) {
                                         currentSizeText = `${Math.round(sizeNum)}px`;
                                         console.log(`      - Вычисленный размер: ${sizePxStr} -> Отображение: ${currentSizeText}`);
                                     } else {
                                         console.log("      - Вычисленный размер не удалось спарсить во float.");
                                     }
                                 } else {
                                     console.log("      - Вычисленный размер шрифта не в px:", sizePxStr);
                                 }
                            } else {
                                 console.log("      - Элемент для поиска невалиден или вне editable для computed style.");
                            }
                        } else {
                            currentSizeText = `${foundSize}px`;
                        }
                    } else {
                         console.log("      - Диапазон выделения не найден.");
                    }
                } catch (e) {
                    console.warn("      - Ошибка определения размера шрифта для отображения:", e);
                }
            } else {
                 console.log("   - Rangy недоступен или обновление размера шрифта пропущено.");
            }
            fontSizeDisplay.textContent = currentSizeText;
             console.log(`   - Отображение Размера Шрифта установлено на: ${currentSizeText}`);
        } else if (skipFontSizeUpdate) {
             console.log("   - Пропущено обновление Отображения Размера Шрифта.");
        }


        // --- Межстрочный интервал ---
        if (lineHeightSelect) {
            let currentLineHeightValue = ""; // Дефолт для плейсхолдера
            try {
                const selection = window.getSelection();
                if (selection.rangeCount > 0) {
                    const range = selection.getRangeAt(0);
                    let container = range.startContainer;
                    if (container.nodeType === Node.TEXT_NODE) container = container.parentElement;

                    // Находим ближайший блочный элемент (p, li, h*, div) *внутри* editable
                    const targetBlock = container ? container.closest('p, li, h1, h2, h3, h4, h5, h6, div') : null;

                    if (targetBlock && editableElement.contains(targetBlock)) {
                        const computedStyle = window.getComputedStyle(targetBlock);
                        let actualLineHeight = computedStyle.lineHeight;
                        console.log("   - Межстрочный интервал: Computed style is", actualLineHeight);

                        if (actualLineHeight === 'normal') {
                            currentLineHeightValue = ""; // Соответствует опции "Интервал"
                        } else if (actualLineHeight.endsWith('px')) {
                            // Конвертируем px в относительное значение на основе размера шрифта для сравнения
                            const fontSize = parseFloat(computedStyle.fontSize);
                            if (fontSize > 0) {
                                const relativeHeight = parseFloat(actualLineHeight) / fontSize;
                                // Находим ближайшую опцию в select
                                let bestMatch = "";
                                let minDiff = Infinity;
                                for (let i = 0; i < lineHeightSelect.options.length; i++) {
                                    const optionValStr = lineHeightSelect.options[i].value;
                                    if (optionValStr) { // Пропускаем дефолтную "" опцию
                                        const optionVal = parseFloat(optionValStr);
                                        const diff = Math.abs(optionVal - relativeHeight);
                                        // Используем порог для совпадения (например, 0.1)
                                        if (diff < minDiff && diff < 0.1) {
                                            minDiff = diff;
                                            bestMatch = optionValStr;
                                        }
                                    }
                                }
                                 currentLineHeightValue = bestMatch; // Может остаться "", если нет близкого совпадения
                                 console.log(`      - Вычисленное относительное: ${relativeHeight.toFixed(2)}, Лучшее совпадение: ${bestMatch}`);
                            } else { currentLineHeightValue = ""; } // Не можем вычислить, если размер шрифта 0
                        } else {
                            // Если это безразмерное значение (например, '1.5'), ищем точное совпадение
                             let foundExact = false;
                             for (let i = 0; i < lineHeightSelect.options.length; i++) {
                                 if (lineHeightSelect.options[i].value === actualLineHeight) {
                                     currentLineHeightValue = actualLineHeight;
                                     foundExact = true;
                                     break;
                                 }
                             }
                             if (!foundExact) currentLineHeightValue = ""; // Дефолт, если нет точного безразмерного совпадения
                             console.log(`      - Безразмерное значение: ${actualLineHeight}, Найдено точное совпадение: ${foundExact}`);
                        }
                    } else {
                        console.log("   - Межстрочный интервал: Целевой блок не найден или вне editable.");
                        currentLineHeightValue = "";
                    } // Подходящий блок не найден
                } else { currentLineHeightValue = ""; } // Нет выделения
            } catch (e) {
                console.warn("   - Ошибка определения межстрочного интервала:", e);
                currentLineHeightValue = ""; // Дефолт при ошибке
            }
            lineHeightSelect.value = currentLineHeightValue;
             console.log(`   - Селект Межстрочного интервала установлен на: "${currentLineHeightValue}"`);
        }

        // --- Название Шрифта ---
        if (fontNameSelect) {
            let currentFont = "";
            try {
                 // Сначала пробуем queryCommandValue (менее надежно для вложенных стилей)
                currentFont = document.queryCommandValue('fontName');
                if (currentFont) {
                    currentFont = currentFont.replace(/['"]/g, '').trim(); // Очищаем от кавычек
                     console.log("   - Название Шрифта: queryCommandValue вернул:", currentFont);
                }

                // Если queryCommandValue не сработал или вернул бесполезное значение, проверяем computed style
                if (!currentFont || currentFont === 'false' /* IE может вернуть "false" */) {
                     const selection = window.getSelection();
                     if (selection.rangeCount > 0) {
                         let container = selection.getRangeAt(0).commonAncestorContainer;
                         if (container.nodeType === Node.TEXT_NODE) container = container.parentElement;
                         if (container && editableElement.contains(container)) {
                             // Получаем первый шрифт из computed stack и очищаем его
                              currentFont = window.getComputedStyle(container).fontFamily.split(',')[0].replace(/['"]/g, '').trim();
                              console.log("   - Название Шрифта: Computed style вернул:", currentFont);
                         } else {
                              console.log("   - Название Шрифта: Контейнер невалиден для computed style.");
                         }
                     }
                }

                // Пытаемся сопоставить найденный шрифт (без учета регистра) с опциями select
                let found = false;
                if (currentFont) {
                    const currentFontLower = currentFont.toLowerCase();
                    for (let i = 0; i < fontNameSelect.options.length; i++) {
                        const optionValueLower = fontNameSelect.options[i].value.toLowerCase();
                        // Приоритет сопоставлению с атрибутом 'value'
                        if (optionValueLower === currentFontLower) {
                            fontNameSelect.selectedIndex = i;
                            found = true;
                            console.log(`      - Совпадение шрифта по value: ${fontNameSelect.options[i].value}`);
                            break;
                        }
                    }
                     // Fallback: Если нет совпадения по value, пробуем сопоставить с текстом опции (менее точно)
                     if (!found) {
                          for (let i = 0; i < fontNameSelect.options.length; i++) {
                              const optionTextLower = fontNameSelect.options[i].textContent.toLowerCase();
                              if (optionTextLower.includes(currentFontLower)) { // Используем includes для частичного совпадения
                                  fontNameSelect.selectedIndex = i;
                                  found = true;
                                  console.log(`      - Совпадение шрифта по text content (частичное): ${fontNameSelect.options[i].textContent}`);
                                  break; // Останавливаемся после первого частичного совпадения по тексту
                              }
                          }
                     }
                }

                if (!found) {
                     fontNameSelect.selectedIndex = 0; // Дефолт "Шрифт"
                     console.log("   - Название Шрифта: Совпадение не найдено, устанавливаем дефолт.");
                }
            } catch (e) {
                console.warn("   - Ошибка определения названия шрифта:", e);
                fontNameSelect.selectedIndex = 0; // Дефолт при ошибке
            }
             console.log(`   - Селект Названия Шрифта установлен на индекс: ${fontNameSelect.selectedIndex}`);
        }
         console.log("[updateToolbarState] Завершено обновление состояния тулбара.");
    }


    // Вспомогательная функция для преобразования RGB в HEX
    function rgbToHex(rgbString) {
        if (!rgbString || typeof rgbString !== 'string' || !rgbString.startsWith('rgb')) return null;
        const result = /^rgb\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)/.exec(rgbString);
        if (!result) return null;
        try {
             const r = parseInt(result[1], 10);
             const g = parseInt(result[2], 10);
             const b = parseInt(result[3], 10);
             if (isNaN(r) || isNaN(g) || isNaN(b)) return null;
             return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1).toUpperCase();
        } catch { return null;}
    }


    // --- Обработчики команд тулбара ---

    // Обработчик для стандартных кнопок (bold, italic, list, unlink)
    textEditorToolbar.addEventListener('click', (event) => {
        const button = closest(event.target, 'button[data-command]');
        if (!button) return;

        const command = button.dataset.command;
        // ADDED 'underline' to the list of simple commands
        if (['bold', 'italic', 'underline', 'insertUnorderedList', 'insertOrderedList', 'unlink'].includes(command)) {
             event.preventDefault();
             console.log(`[Toolbar Button] Команда: ${command}`);
             applyCommand(command);
             return; // Handled
        }
        // Handle other specific commands (like createLink, applyForeColor) if needed elsewhere
        // Ignore others
        if (!['applyForeColor', 'createLink', 'fontSize'].includes(command)) {
            console.log("Неизвестная или уже обработанная команда кнопки:", command);
        }

    });

    // Обработчик для команды создания ссылки (требует prompt ИЛИ МОДАЛКУ)
        textEditorToolbar.addEventListener('click', (event) => {
             const linkButton = closest(event.target, 'button[data-command="createLink"]');
             if (!linkButton) return;
             event.preventDefault(); // Предотвращаем потерю фокуса

             const currentSelection = window.getSelection();
             if (currentSelection.rangeCount > 0 && !currentSelection.isCollapsed) {
                  savedRange = currentSelection.getRangeAt(0).cloneRange();
                  console.log("[Link Button Click] Выделение сохранено в savedRange.");
             } else {
                  savedRange = null; // Сбрасываем, если нет валидного выделения для сохранения
                  console.warn("[Link Button Click] Нет валидного выделения для сохранения перед открытием модалки URL.");
                  // Возможно, стоит прервать открытие модалки, если нет выделения?
                  // return;
             }


             const urlInputModal = document.getElementById('urlInputModal'); // Находим элементы модального окна
             const urlInput = document.getElementById('urlInput');

             if (urlInputModal && urlInput) {
                 // Попытка получить существующую ссылку для редактирования (не обязательно, но полезно)
                 let existingUrl = '';
                 try {
                      // Используем НОВЫЙ сохраненный range
                      if (savedRange) {
                         let container = savedRange.commonAncestorContainer; // Используем commonAncestorContainer
                         if (container.nodeType !== Node.ELEMENT_NODE) container = container.parentElement;
                         const closestAnchor = container ? container.closest('a') : null; // Ищем ближайшую ссылку у родителя
                         if (closestAnchor && closest(closestAnchor, '[contenteditable="true"]')) { // Проверяем, что ссылка внутри editable
                             existingUrl = closestAnchor.getAttribute('href') || '';
                         }
                      }
                 } catch(e) { console.warn("Не удалось получить существующий URL", e); }

                 urlInput.value = existingUrl || 'https://'; // Показываем существующий URL или https://
                 showElement(urlInputModal); // Используем вашу функцию showElement
                 // Устанавливаем фокус в поле ввода через небольшой таймаут
                 setTimeout(() => urlInput.focus(), 50);
             } else {
                 console.error("Элементы модального окна URL не найдены!");
                 // Fallback на старый prompt, если модалка не найдена
                 const url = prompt('Enter the link URL:', 'https://');
                 if (url) {
                     // Здесь стандартный applyCommand может не сработать, так как savedRange мог быть null
                     // Лучше оставить как есть или добавить проверку savedRange
                     if (savedRange) {
                         applyCommand('createLink', url); // Попытаемся выполнить стандартно, если range был
                     } else {
                         console.warn("Нет сохраненного выделения для fallback prompt.");
                     }
                 } else {
                      // restoreFocusAndSelection(); // Восстановить фокус если URL не ввели (если savedRange есть)
                 }
             }
        });

    // Обработчик для кнопки "Применить цвет"
    if (applyColorBtn) {
        applyColorBtn.addEventListener('click', (event) => {
            event.preventDefault(); // Предотвращаем потерю фокуса
            const colorToApply = foreColorInput ? foreColorInput.value : null;
            console.log(`[Apply Color Button] Попытка применить цвет: ${colorToApply}`);
            if (colorToApply) {
                 applyCommand('foreColor', colorToApply);
            } else {
                 console.warn(`[Apply Color Button] Нет цвета для применения.`);
                 restoreFocusAndSelection(); // Вернуть фокус если нет цвета
            }
        });
    }

     // --- Обработка Enter на инпуте цвета ---
     if (foreColorInput) {
         foreColorInput.addEventListener('keydown', (event) => {
             if (event.key === 'Enter' || event.keyCode === 13) {
                 event.preventDefault(); // Предотвращаем стандартное поведение Enter
                 console.log("[Color Input Enter] Нажат Enter, применяем цвет.");
                 applyColorBtn.click(); // Имитируем клик по кнопке "Применить"
             }
         });
         // Предотвращаем потерю фокуса с contenteditable при клике, позволяем получить фокус
         foreColorInput.addEventListener('mousedown', (e) => {
              console.log("Mousedown on foreColorInput");
         });
         foreColorInput.addEventListener('focus', (e) => {
              console.log("Focus on foreColorInput");
         });
     }
// Обработчик для выбора шрифта
     if (fontNameSelect) {
        fontNameSelect.addEventListener('change', () => {
            const selectedFont = fontNameSelect.value;
            if (selectedFont) {
                console.log(`[Font Select Change] Попытка применить шрифт: ${selectedFont}`);
                applyCommand('fontName', selectedFont);
            } else {
                // Если выбрана опция "Шрифт", можно либо ничего не делать,
                // либо попытаться удалить стиль шрифта (сложнее)
                console.log("[Font Select Change] Выбрана опция по умолчанию.");
                restoreFocusAndSelection(); // Просто восстановить фокус
            }
        });

         // Предотвращаем потерю фокуса при mousedown на select
         fontNameSelect.addEventListener('mousedown', (e) => {
             // Не нужно preventDefault, чтобы dropdown открылся
             console.log("Mousedown on fontNameSelect");
         });
         fontNameSelect.addEventListener('focus', (e) => {
             console.log("Focus on fontNameSelect");
         });
    }

    // Добавляем обработчик для нового select
    if (lineHeightSelect) {
        lineHeightSelect.addEventListener('change', () => {
            const value = lineHeightSelect.value;
            console.log(`[Line Height Change] Попытка применить интервал: ${value || 'default'}`);
            applyLineHeight(value); // Вызываем новую функцию применения
        });

        // Предотвращаем потерю фокуса при mousedown на select
        lineHeightSelect.addEventListener('mousedown', (e) => {
            // Не нужно preventDefault, чтобы dropdown открылся
            console.log("Mousedown on lineHeightSelect");
        });
        lineHeightSelect.addEventListener('focus', (e) => {
             console.log("Focus on lineHeightSelect");
        });
    }


    // --- Основные функции применения команд ---

    /**
     * Восстанавливает фокус и ВЫДЕЛЕНИЕ на основе savedRange.
     * @returns {boolean} - true, если попытка восстановления была успешной (или хотя бы предпринята), false если savedRange пуст или невалиден.
     */
    function restoreFocusAndSelection() {
        if (!savedRange) {
            console.warn("[restoreFocusAndSelection] Нет сохраненного выделения (savedRange is null).");
            return false;
        }

        // Находим редактируемый элемент, начиная с общего предка сохраненного диапазона
        let ancestor = savedRange.commonAncestorContainer;
        const editableElement = closest(ancestor, '[contenteditable="true"]'); // Ищем ближайший editable

        if (!editableElement) {
            console.warn("[restoreFocusAndSelection] Не найден contenteditable родитель для общего предка savedRange:", ancestor);
            // Возможно, стоит инвалидировать savedRange здесь, если он указывает вне editable
            // savedRange = null;
            return false;
        }

        // Базовая проверка: находятся ли точки диапазона все еще внутри найденного editable элемента?
        // Это не ловит все случаи изменения DOM, но отсекает очевидно невалидные диапазоны.
        if (!editableElement.contains(savedRange.startContainer) || !editableElement.contains(savedRange.endContainer)) {
             console.warn("[restoreFocusAndSelection] Границы сохраненного диапазона больше не находятся внутри editable элемента. Диапазон может быть невалидным.");
             // savedRange = null; // Инвалидируем потенциально сломанный диапазон
             return false;
        }

        // 1. Устанавливаем фокус
        editableElement.focus();

        // 2. Восстанавливаем выделение (используем timeout, как и раньше)
        // Возвращаем true *перед* таймаутом, т.к. сама попытка восстановления инициирована
        let restoreAttempted = true;
        setTimeout(() => {
            try {
                const selection = window.getSelection();
                selection.removeAllRanges();
                selection.addRange(savedRange); // Используем сам объект savedRange
                console.log("[restoreFocusAndSelection] Фокус и выделение успешно восстановлены.");
            } catch (e) {
                console.error("[restoreFocusAndSelection] Ошибка добавления сохраненного диапазона:", e);
                // Инвалидируем диапазон, если его добавление не удалось
                // savedRange = null;
                // restoreAttempted = false; // Можно изменить флаг здесь, но функция уже вернула true
            }
        }, 0); // Timeout часто помогает браузеру сначала обработать фокус

        return restoreAttempted; // Возвращаем true, если попытка была начата
    }


/**
 * Unwraps an element, moving its children to its parent and removing the element.
 * Preserves selection boundaries if provided.
 * @param {HTMLElement} element - The element to unwrap.
 * @param {Array<DOMPosition>} [positionsToPreserve] - Array of Rangy DOM positions to update.
 */
function unwrapElement(element, positionsToPreserve) {
    const parent = element.parentNode;
    if (!parent) return;

    const docFrag = document.createDocumentFragment();
    let child;
    while ((child = element.firstChild)) {
        docFrag.appendChild(child);
    }

    // --- Boundary preservation logic (Simplified from Rangy internal concept) ---
    // This part is tricky. We need to adjust positions that might point inside
    // the element being removed or to the element itself.
    if (positionsToPreserve) {
        const nodeIndex = rangy.dom.getNodeIndex(element);
        positionsToPreserve.forEach(pos => {
            if (rangy.dom.isAncestorOf(element, pos.node, true)) {
                // Position is inside the element being unwrapped
                // Try to map it relative to the parent, before the first child moved out
                pos.node = parent;
                // Offset needs careful calculation based on where children are inserted
                // For simplicity here, we'll just set it before the first child moved out
                 // This might not be perfect for all cases but prevents errors
                 pos.offset = nodeIndex + pos.offset; // Adjust based on element's original index + internal offset
                                                    // This needs refinement for complex cases
            } else if (pos.node === parent && pos.offset > nodeIndex) {
                // Position is after the element in the same parent
                // Adjust offset based on number of children moved out minus 1 (for the removed element)
                pos.offset += docFrag.childNodes.length - 1;
            }
        });
    }
    // --- End Boundary Logic ---

    parent.replaceChild(docFrag, element);
}


/**
 * Checks if a span element is effectively empty (no significant attributes/classes).
 * @param {HTMLElement} spanElement - The span to check.
 * @returns {boolean} True if the span can be unwrapped.
 */
function isSpanRemovable(spanElement) {
    if (spanElement.tagName !== 'SPAN') return false;
    // Check for inline styles (except potentially font-size which we are removing)
    if (spanElement.style.length > 0) {
         for (let i = 0; i < spanElement.style.length; i++) {
             const propName = spanElement.style[i];
             // Allow specific styles if needed, otherwise any style makes it non-removable
             // Example: allow line-height? if (propName.toLowerCase() !== 'line-height') return false;
             if (propName.toLowerCase() !== 'font-size') { // Check if ONLY font-size style exists
                  return false;
             }
         }
         // If only font-size style was present, it's removable after class cleanup
    }
    // Check for other classes (besides font-size-*)
    for (const cls of spanElement.classList) {
        if (!cls.startsWith('font-size-')) {
            return false; // Has other classes, don't remove
        }
    }
    // Check for other meaningful attributes (like data-*, id, etc.)
    const allowedAttrs = ['class', 'style']; // Attributes we handle/ignore
    for (let i = 0; i < spanElement.attributes.length; i++) {
        if (!allowedAttrs.includes(spanElement.attributes[i].name.toLowerCase())) {
             return false;
        }
    }
    return true; // No other classes or styles or attributes
}

// ==========================================================================
// --- START: REPLACEMENT FOR changeFontSize FUNCTION ONLY (V3 - Manual Cleanup) ---
// ==========================================================================

/**
 * Unwraps an element, moving its children to its parent and removing the element.
 * Preserves selection boundaries if provided.
 * @param {HTMLElement} element - The element to unwrap.
 * @param {Array<DOMPosition>} [positionsToPreserve] - Array of Rangy DOM positions to update.
 */
function unwrapElement(element, positionsToPreserve) {
    const parent = element.parentNode;
    if (!parent) return;

    const docFrag = document.createDocumentFragment();
    let child;
    while ((child = element.firstChild)) {
        docFrag.appendChild(child);
    }

    // --- Boundary preservation logic (Simplified from Rangy internal concept) ---
    // This part is tricky. We need to adjust positions that might point inside
    // the element being removed or to the element itself.
    if (positionsToPreserve) {
        const nodeIndex = rangy.dom.getNodeIndex(element);
        positionsToPreserve.forEach(pos => {
            if (rangy.dom.isAncestorOf(element, pos.node, true)) {
                // Position is inside the element being unwrapped
                // Try to map it relative to the parent, before the first child moved out
                pos.node = parent;
                // Offset needs careful calculation based on where children are inserted
                // For simplicity here, we'll just set it before the first child moved out
                 // This might not be perfect for all cases but prevents errors
                 pos.offset = nodeIndex + pos.offset; // Adjust based on element's original index + internal offset
                                                    // This needs refinement for complex cases
            } else if (pos.node === parent && pos.offset > nodeIndex) {
                // Position is after the element in the same parent
                // Adjust offset based on number of children moved out minus 1 (for the removed element)
                pos.offset += docFrag.childNodes.length - 1;
            }
        });
    }
    // --- End Boundary Logic ---

    parent.replaceChild(docFrag, element);
}


/**
 * Checks if a span element is effectively empty (no significant attributes/classes).
 * @param {HTMLElement} spanElement - The span to check.
 * @returns {boolean} True if the span can be unwrapped.
 */
function isSpanRemovable(spanElement) {
    if (spanElement.tagName !== 'SPAN') return false;
    // Check for inline styles (except potentially font-size which we are removing)
    if (spanElement.style.length > 0) {
         for (let i = 0; i < spanElement.style.length; i++) {
             const propName = spanElement.style[i];
             // Allow specific styles if needed, otherwise any style makes it non-removable
             // Example: allow line-height? if (propName.toLowerCase() !== 'line-height') return false;
             if (propName.toLowerCase() !== 'font-size') { // Check if ONLY font-size style exists
                  return false;
             }
         }
         // If only font-size style was present, it's removable after class cleanup
    }
    // Check for other classes (besides font-size-*)
    for (const cls of spanElement.classList) {
        if (!cls.startsWith('font-size-')) {
            return false; // Has other classes, don't remove
        }
    }
    // Check for other meaningful attributes (like data-*, id, etc.)
    const allowedAttrs = ['class', 'style']; // Attributes we handle/ignore
    for (let i = 0; i < spanElement.attributes.length; i++) {
        if (!allowedAttrs.includes(spanElement.attributes[i].name.toLowerCase())) {
             return false;
        }
    }
    return true; // No other classes or styles or attributes
}


// ==========================================================================
// --- START: REPLACEMENT FOR changeFontSize FUNCTION ONLY (V4 - Handle Single Text Node) ---
// ==========================================================================

/**
 * Unwraps an element, moving its children to its parent and removing the element.
 * Preserves selection boundaries if provided.
 * @param {HTMLElement} element - The element to unwrap.
 * @param {Array<rangy.DomPosition>} [positionsToPreserve] - Array of Rangy DOM positions to update.
 */
function unwrapElement(element, positionsToPreserve) {
    const parent = element.parentNode;
    if (!parent) return;

    const docFrag = document.createDocumentFragment();
    let child;
    while ((child = element.firstChild)) {
        docFrag.appendChild(child);
    }

    if (positionsToPreserve) {
        const nodeIndex = rangy.dom.getNodeIndex(element);
        positionsToPreserve.forEach(pos => {
            if (rangy.dom.isAncestorOf(element, pos.node, true)) {
                 // Adjust position relative to the parent node if it was inside the unwrapped element
                pos.node = parent;
                pos.offset = nodeIndex + pos.offset; // Simplified adjustment
                 // NOTE: More precise adjustment might be needed for complex cases involving multiple children
            } else if (pos.node === parent && pos.offset > nodeIndex) {
                // Position is after the element in the same parent
                pos.offset += docFrag.childNodes.length - 1;
            }
        });
    }

    parent.replaceChild(docFrag, element);
     console.log("   - Element unwrapped:", element); // Log unwrapping
}


/**
 * Checks if a span element is effectively empty (no significant attributes/classes).
 * @param {HTMLElement} spanElement - The span to check.
 * @returns {boolean} True if the span can be unwrapped.
 */
function isSpanRemovable(spanElement) {
    if (!spanElement || spanElement.tagName !== 'SPAN') return false;
    // Check for inline styles other than font-size
    if (spanElement.style.length > 0) {
         for (let i = 0; i < spanElement.style.length; i++) {
             const propName = spanElement.style[i];
             if (propName.toLowerCase() !== 'font-size') {
                  return false; // Has other styles
             }
         }
    }
    // Check for other classes
    for (const cls of spanElement.classList) {
        if (!cls.startsWith('font-size-')) {
            return false; // Has other classes
        }
    }
    // Check for other attributes
    const allowedAttrs = ['class', 'style'];
    for (let i = 0; i < spanElement.attributes.length; i++) {
        if (!allowedAttrs.includes(spanElement.attributes[i].name.toLowerCase())) {
             return false; // Has other attributes
        }
    }
    return true;
}

/**
 * Changes the font size of the selected text based on increment.
 * Includes special handling for selections entirely within a single text node.
 * @param {number} increment - +1 to increase, -1 to decrease.
 */
const changeFontSize = (increment) => {
    console.log(`[changeFontSize V4] Called with increment: ${increment}`);
    if (typeof rangy === 'undefined') { console.error("Rangy not defined."); return; }

    let sel, range, editableElement;

    try {
        rangy.init();
        sel = rangy.getSelection();

        // 1. Validate Selection
        if (!sel || sel.rangeCount === 0) { /* ... (same validation as V3) ... */
             console.warn("[changeFontSize V4] No selection. Attempting restore...");
             if (!restoreFocusAndSelection()) { console.warn("[changeFontSize V4] Restore failed. Aborting."); return; }
             sel = rangy.getSelection();
             if (!sel || sel.rangeCount === 0) { console.warn("[changeFontSize V4] Still no selection. Aborting."); return; }
        }
        if (sel.isCollapsed) { /* ... (same collapsed check as V3) ... */
             console.warn("[changeFontSize V4] Selection collapsed.");
             if (restoreFocusAndSelection()) { /* ... (update toolbar based on focus) ... */
                  sel = rangy.getSelection(); if (sel && sel.focusNode) { const focusEditable = closest(sel.focusNode, '[contenteditable="true"]'); if (focusEditable) updateToolbarState(focusEditable); }
             }
             return;
        }
        range = sel.getRangeAt(0);
        editableElement = closest(range.commonAncestorContainer, '[contenteditable="true"]');
        if (!editableElement) { console.warn("[changeFontSize V4] Selection outside editable."); return; }
        console.log("[changeFontSize V4] Valid selection in:", editableElement);

        // --- Check for Single Text Node Case ---
        const isSingleTextNodeSelection = range.startContainer === range.endContainer &&
                                          range.startContainer.nodeType === Node.TEXT_NODE;
        console.log(`[changeFontSize V4] Is single text node selection? ${isSingleTextNodeSelection}`);
        // --------------------------------------

        // 2. Determine Base Size (Minimum size within selection)
        //    (Logic remains the same as V3)
        let baseSize = 16; // Default
        // ... (Insert the base size determination logic from V3 here) ...
         let minSize = 73; let foundAnySizeClass = false;
         console.log("[changeFontSize V4] Determining minimum size...");
         try {
             const nodes = range.getNodes([1, 3]); if (nodes.length === 0 && range.startContainer.nodeType === 3) nodes.push(range.startContainer);
             console.log(`   - Found ${nodes.length} nodes.`);
             nodes.forEach(node => {
                 let searchElement = (node.nodeType === 1) ? node : node.parentElement;
                 while (searchElement && editableElement.contains(searchElement) && !searchElement.hasAttribute('contenteditable')) {
                     if (searchElement.tagName === "SPAN" && searchElement.classList) {
                         for (const cls of searchElement.classList) { if (cls.startsWith("font-size-")) { const sizeMatch = cls.match(/font-size-(\d+)/); if (sizeMatch && sizeMatch[1]) { const currentSize = parseInt(sizeMatch[1], 10); minSize = Math.min(minSize, currentSize); foundAnySizeClass = true; } } }
                     } searchElement = searchElement.parentElement;
                 }
             });
         } catch (e) { console.error("[changeFontSize V4] Error getting nodes:", e); }
         if (foundAnySizeClass) { baseSize = minSize; }
         else { /* Fallback to computedStyle */
             let commonAncestor = range.commonAncestorContainer; if (commonAncestor.nodeType !== Node.ELEMENT_NODE) commonAncestor = commonAncestor.parentElement;
             if (commonAncestor && editableElement.contains(commonAncestor)) { try { baseSize = Math.round(parseFloat(window.getComputedStyle(commonAncestor).fontSize)); if (isNaN(baseSize)) baseSize = 16; } catch(e) { baseSize = 16; } } else { baseSize = 16; }
         }
        console.log(`[changeFontSize V4] Base Size: ${baseSize}px`);


        // 3. Calculate Target Size
        //    (Logic remains the same as V3)
        const currentIndex = supportedFontSizes.indexOf(baseSize);
        let nextIndex;
        if (currentIndex === -1) { /* ... (handle index not found) ... */
            if (increment > 0) { nextIndex = supportedFontSizes.findIndex(s => s >= baseSize); if (nextIndex === -1) nextIndex = supportedFontSizes.length - 1;} else { for(let i=supportedFontSizes.length-1; i>=0; i--) { if(supportedFontSizes[i]<=baseSize){nextIndex=i;break;}} if(nextIndex === undefined) nextIndex = 0; nextIndex--;}
        } else { nextIndex = currentIndex + increment; }
        nextIndex = Math.max(0, Math.min(nextIndex, supportedFontSizes.length - 1));
        const targetSize = supportedFontSizes[nextIndex];
        const targetClassName = `font-size-${targetSize}`;
        console.log(`[changeFontSize V4] Target Size: ${targetSize}px (Class: ${targetClassName})`);

        // Check if change is needed (same as V3)
        if (targetSize === baseSize && foundAnySizeClass && increment !== 0) {
            console.log(`[changeFontSize V4] Target same as base, no change needed.`);
            if (fontSizeDisplay) fontSizeDisplay.textContent = `${targetSize}px`; updateToolbarState(editableElement, true); return;
        }


        // --- 4. Cleanup and Apply ---
        console.log("[changeFontSize V4] --- STARTING CLEANUP + APPLY ---");
        try {
            const targetApplier = getFontSizeClassApplier(targetSize);
            if (!targetApplier) throw new Error(`Failed get applier for ${targetSize}`);

            // A. Save Boundaries
            const startPos = new rangy.dom.DomPosition(range.startContainer, range.startOffset);
            const endPos = new rangy.dom.DomPosition(range.endContainer, range.endOffset);
            const positionsToPreserve = [startPos, endPos];
            console.log("   - Saved boundaries:", startPos.inspect(), endPos.inspect());

            // B. *** Conditional Cleanup Logic ***
            if (isSingleTextNodeSelection) {
                // --- Single Text Node Path ---
                console.log("   - Executing Single Text Node cleanup path...");
                const textNode = range.startContainer;
                const parentSpan = textNode.parentElement;

                // Check if parent is a SPAN we might need to clean
                if (parentSpan && parentSpan.tagName === "SPAN" && editableElement.contains(parentSpan)) {
                    console.log("      - Parent is SPAN:", parentSpan);
                    let parentClassRemoved = false;
                    const parentClassesToRemove = [];
                    parentSpan.classList.forEach(cls => {
                        if (cls.startsWith('font-size-')) {
                            parentClassesToRemove.push(cls);
                            parentClassRemoved = true;
                        }
                    });
                    parentClassesToRemove.forEach(cls => parentSpan.classList.remove(cls));

                    if (parentClassRemoved) {
                         console.log(`      - Removed font-size-* classes from parent SPAN.`);
                         // Check if parent span needs unwrapping AFTER removing classes
                         if (isSpanRemovable(parentSpan)) {
                              console.log("      - Parent SPAN marked for unwrapping.");
                              // We need to unwrap *before* applyToRange affects the node structure
                              unwrapElement(parentSpan, positionsToPreserve);
                              // Important: After unwrapping, the range boundaries are now relative
                              // to the *new* parent of the text node.
                              // The positionsToPreserve should have been updated by unwrapElement.
                              console.log("      - Parent SPAN unwrapped. Updated positions:", positionsToPreserve[0].inspect(), positionsToPreserve[1].inspect());
                              // Re-fetch the potentially modified range boundaries before applying
                              try {
                                   range.setStart(positionsToPreserve[0].node, positionsToPreserve[0].offset);
                                   range.setEnd(positionsToPreserve[1].node, positionsToPreserve[1].offset);
                                   console.log("      - Range boundaries reset after parent unwrap.");
                              } catch(e) {
                                   console.error("      - Error resetting range boundaries after parent unwrap:", e);
                                   // Consider aborting or falling back if boundaries are lost
                                   throw new Error("Boundary reset failed after unwrap.");
                              }
                         }
                    } else {
                         console.log("      - Parent SPAN has no font-size-* classes to remove.");
                    }
                } else {
                     console.log("      - No SPAN parent found or parent is outside editable.");
                }
                // --- End Single Text Node Path ---
            } else {
                // --- Multi-Node / Span Intersection Path (Original V3 Logic) ---
                console.log("   - Executing Multi-Node/Span Intersection cleanup path...");
                const spansToProcess = range.getNodes([1], el => el.tagName === "SPAN" && range.intersectsNode(el));
                console.log(`   - Found ${spansToProcess.length} SPANs intersecting range.`);
                const spansToUnwrap = [];
                spansToProcess.forEach(span => {
                    let classRemoved = false; const classesToRemove = [];
                    span.classList.forEach(cls => { if (cls.startsWith('font-size-')) { classesToRemove.push(cls); classRemoved = true; } });
                    classesToRemove.forEach(cls => span.classList.remove(cls));
                    if (classRemoved && isSpanRemovable(span)) { spansToUnwrap.push(span); }
                });
                console.log(`   - Unwrapping ${spansToUnwrap.length} spans...`);
                for (let i = spansToUnwrap.length - 1; i >= 0; i--) {
                    const span = spansToUnwrap[i];
                     if (span.parentNode && editableElement.contains(span)) {
                         unwrapElement(span, positionsToPreserve);
                     } else { console.log(`      - Skipping unwrap (already removed/outside):`, span); }
                }
                // --- End Multi-Node Path ---
            }

            // C. Restore Range Boundaries (Crucial AFTER any potential unwrapping)
            console.log("   - Restoring boundaries before apply:", positionsToPreserve[0].inspect(), positionsToPreserve[1].inspect());
            let restoreSuccess = false;
            try {
                 // Ensure the nodes in positions still exist and are valid
                 if (positionsToPreserve[0].node && positionsToPreserve[0].node.parentNode &&
                     positionsToPreserve[1].node && positionsToPreserve[1].node.parentNode &&
                     editableElement.contains(positionsToPreserve[0].node) && // Check containment again
                     editableElement.contains(positionsToPreserve[1].node))
                 {
                     // Check offsets are valid
                     const startNodeLength = rangy.dom.getNodeLength(positionsToPreserve[0].node);
                     const endNodeLength = rangy.dom.getNodeLength(positionsToPreserve[1].node);

                     if (positionsToPreserve[0].offset <= startNodeLength && positionsToPreserve[1].offset <= endNodeLength) {
                          range.setStart(positionsToPreserve[0].node, positionsToPreserve[0].offset);
                          range.setEnd(positionsToPreserve[1].node, positionsToPreserve[1].offset);
                          sel.setSingleRange(range); // Update selection object
                          savedRange = range.cloneRange(); // Update savedRange
                          restoreSuccess = true;
                          console.log("   - Boundaries restored successfully.");
                     } else {
                          console.warn("   - Boundary restore failed: Invalid offsets.", `Start Offset: ${positionsToPreserve[0].offset}/${startNodeLength}`, `End Offset: ${positionsToPreserve[1].offset}/${endNodeLength}`);
                     }
                 } else {
                     console.warn("   - Boundary restore failed: Nodes invalid or outside editable.");
                 }

            } catch (restoreError) {
                 console.error("   - Error during boundary restore:", restoreError);
            }

            if (!restoreSuccess) {
                console.error("   - CRITICAL: Failed to restore valid range boundaries. Aborting apply.");
                 // Optionally try a broad fallback like selecting the editable content
                 // range.selectNodeContents(editableElement); sel.setSingleRange(range); savedRange = range.cloneRange();
                 throw new Error("Failed to restore range boundaries after cleanup."); // Stop further execution
            }


            // D. Apply the TARGET class using applyToRange
            console.log(`   - Applying TARGET class ${targetClassName} to restored range...`);
            targetApplier.applyToRange(range);
            console.log(`   - Target class ${targetClassName} applied.`);

            // E. Force Selection Refresh AGAIN after applyToRange (important for single node case)
             console.log("   - Forcing final selection refresh...");
             try {
                 // Re-get the range from the selection as applyToRange might modify it
                 const finalRange = sel.getRangeAt(0).cloneRange();
                 const isBackward = sel.isBackward();
                 sel.removeAllRanges();
                 sel.addRange(finalRange, isBackward);
                 savedRange = finalRange.cloneRange(); // Save the very final state
                 console.log("   - Final selection refreshed and savedRange updated.");
             } catch (finalRefreshError) {
                 console.error("   - Error during final selection refresh:", finalRefreshError);
             }

        } catch (e) {
            console.error("[changeFontSize V4] Error during Cleanup/Apply block:", e);
            if (editableElement) editableElement.focus(); // Try to refocus on error
        }

        // 5. Update UI
        if (fontSizeDisplay) { fontSizeDisplay.textContent = `${targetSize}px`; }
        setTimeout(() => {
             const currentActiveEditable = document.activeElement?.closest('[contenteditable=true]');
             if (currentActiveEditable) { updateToolbarState(currentActiveEditable, true); }
             else if (editableElement) { updateToolbarState(editableElement, true); }
            console.log("[changeFontSize V4] Toolbar state update scheduled.");
        }, 50);


    } catch (e) {
        console.error("[changeFontSize V4] Global error:", e);
    } finally {
        if (typeof rangy !== 'undefined' && rangy.getSelection) {
            const finalSel = rangy.getSelection();
            if (finalSel) { try { finalSel.refresh(); } catch (e) { console.warn("Final sel.refresh() error:", e); } }
        }
        console.log("[changeFontSize V4] Function finished.");
    }
};



/**
 * Применяет команду форматирования к ТЕКУЩЕМУ выделению браузера.
 * Использует document.execCommand для стандартных команд.
 * Не использует restoreFocusAndSelection для этих команд.
 * @param {string} command - Команда для выполнения (например, 'bold', 'foreColor').
 * @param {string|null} [value=null] - Значение для команды (например, hex цвета, название шрифта).
 */
function applyCommand(command, value = null) {
    console.log(`[applyCommand - Standard Path] Попытка выполнить: ${command}, значение: ${value}`);

    // Используем setTimeout для консистентности и чтобы дать браузеру время
    setTimeout(() => {
        try {
            // 1. Получаем ТЕКУЩЕЕ выделение браузера
            const selection = window.getSelection();

            // 2. Проверяем наличие выделения
            if (!selection || selection.rangeCount === 0) {
                console.warn(`[applyCommand - Standard] Нет выделения для команды '${command}'.`);
                // Пытаемся восстановить фокус, чтобы пользователь мог попробовать снова, но не выполняем команду
                restoreFocusAndSelection();
                return;
            }

            const range = selection.getRangeAt(0);
            const editableElement = closest(range.commonAncestorContainer, '[contenteditable="true"]');

            // 3. Проверяем, что выделение внутри редактируемой зоны
            if (!editableElement) {
                console.warn(`[applyCommand - Standard] Выделение вне editable для '${command}'.`);
                return;
            }

            // 4. Проверяем на collapsed ТОЛЬКО для команд, где это критично
            if (range.collapsed && (command === 'createLink' || command === 'foreColor' || command === 'fontName')) {
                console.warn(`[applyCommand - Standard] Команда '${command}' не применяется к схлопнутому выделению.`);
                // Обновляем тулбар на случай, если состояние кнопки нужно сбросить
                updateToolbarState(editableElement);
                return;
            }

            // 5. Выполняем команду, полагаясь на текущее состояние браузера
            console.log(`[applyCommand - Standard] Выполнение ${command} для текущего выделения...`);
            document.execCommand('styleWithCSS', false, true); // Всегда стараемся использовать CSS
            const success = document.execCommand(command, false, value);
            console.log(`[applyCommand - Standard] Команда ${command} выполнена. Успех: ${success}`);

            // 6. Обновляем состояние тулбара ПОСЛЕ выполнения команды
            // Используем небольшую задержку, чтобы DOM успел обновиться
            setTimeout(() => {
                const activeEditable = document.activeElement?.closest('[contenteditable=true]');
                if (activeEditable) {
                    console.log("[applyCommand - Standard] Обновление состояния тулбара после команды.");
                    updateToolbarState(activeEditable);
                } else {
                    // Если фокус потерян, пробуем обновить на основе элемента, где было выделение
                    console.log("[applyCommand - Standard] Фокус потерян, обновление тулбара на основе исходного editable.");
                    updateToolbarState(editableElement);
                    // Или можно скрыть тулбар, если элемент больше не активен
                    // hideToolbar();
                }
            }, 50); // Короткая задержка после execCommand

        } catch (e) {
            console.error(`[applyCommand - Standard] Ошибка выполнения команды ${command}:`, e);
             // При ошибке можно попытаться восстановить фокус, но это может быть ненадежно
             // restoreFocusAndSelection();
        }
    }, 10); // Небольшая задержка перед execCommand
}

// --- РЕАЛИЗАЦИЯ: applyLineHeight Function (остается как в прошлом ответе) ---
/**
 * Применяет межстрочный интервал к блочным элементам выделения.
 * @param {string} lineHeightValue - Значение line-height (e.g., '1.5', '2') или '' для сброса.
 */
function applyLineHeight(lineHeightValue) {
    if (!restoreFocusAndSelection()) {
        console.warn(`[applyLineHeight] Не удалось восстановить savedRange, работаем с текущей selection.`);
    }

    setTimeout(() => {
        try {
            const selection = window.getSelection();
            if (!selection || selection.rangeCount === 0) {
                console.error("[applyLineHeight] Нет активного выделения."); return;
            }
            const range = selection.getRangeAt(0);
            const editableElement = closest(range.commonAncestorContainer, '[contenteditable="true"]');
            if (!editableElement) {
                console.error("[applyLineHeight] Выделение вне редактируемой зоны."); return;
            }

            console.log(`[applyLineHeight] Применение интервала "${lineHeightValue}"`);

            const blockElements = Array.from(editableElement.querySelectorAll('p, li, h1, h2, h3, h4, h5, h6, div'));
            const selectedBlocks = blockElements.filter(block =>
                selection.containsNode(block, true) || range.intersectsNode(block) ||
                block.contains(range.startContainer) || block.contains(range.endContainer)
            );

            if (selectedBlocks.length === 0) {
                let startContainer = range.startContainer;
                if (startContainer.nodeType === Node.TEXT_NODE) startContainer = startContainer.parentElement;
                const closestBlock = startContainer.closest('p, li, h1, h2, h3, h4, h5, h6, div');
                if (closestBlock && editableElement.contains(closestBlock)) {
                    selectedBlocks.push(closestBlock);
                }
            }

            console.log(`[applyLineHeight] Найдено ${selectedBlocks.length} блоков для применения стиля.`);
            if (selectedBlocks.length > 0) {
                selectedBlocks.forEach(block => { block.style.lineHeight = lineHeightValue; });
                console.log("[applyLineHeight] Стиль применен к блокам.");
            } else {
                console.warn("[applyLineHeight] Не найдено подходящих блоков для применения line-height.");
            }

            setTimeout(() => {
                if (document.activeElement && document.activeElement.closest('[contenteditable=true]')) {
                      updateToolbarState(document.activeElement.closest('[contenteditable=true]'));
                } else { hideToolbar(); }
            }, 50);

        } catch (e) {
            console.error("[applyLineHeight] Ошибка:", e);
        }
    }, 10); // Небольшая задержка
}



// --- ОБНОВЛЕННЫЕ Обработчики для кнопок +/- ---
if (decreaseFontSizeBtn) {
    const debouncedDecrease = debounce((event) => {
        event.preventDefault(); // Предотвращаем дефолтное действие и потерю фокуса
        console.log('Debounced Уменьшить Размер Шрифта Клик');
        changeFontSize(-1);
    }, 150); // Подберите задержку debounce при необходимости (100-250мс обычно хорошо)
    decreaseFontSizeBtn.addEventListener('click', debouncedDecrease);
}

if (increaseFontSizeBtn) {
    const debouncedIncrease = debounce((event) => {
        event.preventDefault(); // Предотвращаем дефолтное действие и потерю фокуса
        console.log('Debounced Увеличить Размер Шрифта Клик');
        changeFontSize(1);
    }, 150); // Подберите задержку debounce при необходимости
    increaseFontSizeBtn.addEventListener('click', debouncedIncrease);
}



    /**
     * Применяет межстрочный интервал к блочным элементам выделения.
     * @param {string} lineHeightValue - Значение line-height (e.g., '1.5', '2') или '' для сброса.
     */
    function applyLineHeight(lineHeightValue) {
        // 1. Пытаемся восстановить фокус
        if (!restoreFocusAndSelection()) {
            console.warn(`[applyLineHeight] Не удалось восстановить savedRange, работаем с текущей selection.`);
        }

        setTimeout(() => {
            try {
                const selection = window.getSelection();
                if (!selection || selection.rangeCount === 0) {
                    console.error("[applyLineHeight] Нет активного выделения.");
                    return;
                }
                const range = selection.getRangeAt(0);
                const editableElement = closest(range.commonAncestorContainer, '[contenteditable="true"]');
                if (!editableElement) {
                    console.error("[applyLineHeight] Выделение вне редактируемой зоны.");
                    return;
                }

                console.log(`[applyLineHeight] Применение интервала "${lineHeightValue}"`);

                // --- Стратегия: Итерация по блокам ---

                // A. Находим все блочные элементы (p, li, div, h*) внутри editable
                const blockElements = Array.from(editableElement.querySelectorAll('p, li, h1, h2, h3, h4, h5, h6, div'));

                // Б. Фильтруем те, которые пересекаются с текущим выделением (range)
                const selectedBlocks = blockElements.filter(block =>
                    selection.containsNode(block, true) // Либо полностью содержит, либо частично
                    || range.intersectsNode(block) // Либо пересекает границы
                    || block.contains(range.startContainer) // Либо содержит начало выделения
                    || block.contains(range.endContainer) // Либо содержит конец выделения
                );

                // Если не нашли блоков (например, выделен только текст без родительского блока),
                // пытаемся найти ближайший блок к началу выделения
                if (selectedBlocks.length === 0) {
                     let startContainer = range.startContainer;
                     if (startContainer.nodeType === Node.TEXT_NODE) startContainer = startContainer.parentElement;
                     const closestBlock = startContainer.closest('p, li, h1, h2, h3, h4, h5, h6, div');
                     if (closestBlock && editableElement.contains(closestBlock)) {
                         selectedBlocks.push(closestBlock);
                     }
                }

                console.log(`[applyLineHeight] Найдено ${selectedBlocks.length} блоков для применения стиля.`);

                // В. Применяем стиль к каждому найденному блоку
                if (selectedBlocks.length > 0) {
                    selectedBlocks.forEach(block => {
                        block.style.lineHeight = lineHeightValue; // Устанавливаем или сбрасываем стиль
                    });
                    console.log("[applyLineHeight] Стиль применен к блокам.");
                } else {
                    console.warn("[applyLineHeight] Не найдено подходящих блоков для применения line-height.");
                    // Можно применить к самому editable как fallback, но это не всегда желаемо
                    // editableElement.style.lineHeight = lineHeightValue;
                }

                // Обновляем состояние тулбара
                setTimeout(() => {
                    if (document.activeElement && document.activeElement.closest('[contenteditable=true]')) {
                          updateToolbarState(document.activeElement.closest('[contenteditable=true]'));
                    } else { hideToolbar(); }
                }, 50);

            } catch (e) {
                console.error("[applyLineHeight] Ошибка:", e);
                alert('Ошибка при применении межстрочного интервала.');
            }
        }, 10); // Небольшая задержка
    }

    /**
     * Creates a new resume block element based on the specified type.
     * Ensures default editable text is wrapped in font-size-16 span.
     * @param {string} type - The type of block to create (e.g., 'name', 'experience', 'custom').
     * @returns {HTMLElement|null} The created block element or null if the type is unknown.
     */
    function createBlockByType(type) {
        const block = document.createElement('div');
        block.className = 'resume-block draggable'; // All blocks are draggable
        block.dataset.type = type;

        let contentHtml = '';
        let needsDelete = true; // Default: Allow deleting
        let needsTitleToggle = true; // Default: Allow toggling H2 visibility

        // Default size class for new content
        const defaultSizeSpanStart = '<span class="font-size-16">';
        const defaultSizeSpanEnd = '</span>';

        switch (type) {
            case 'name':
                 needsTitleToggle = false; // No H2 toggle for name block
                 // H1 and job-title likely have specific styles, avoid default span here
                 contentHtml = `
                    <div contenteditable="false">
                        <h1 contenteditable="true">Your Name</h1>
                        <p class="job-title" contenteditable="true">Desired Position</p>
                    </div>`;
                break;
            case 'contact':
                 needsTitleToggle = true;
                 // Items are handled by createContactItem, which will add spans
                 contentHtml = `
                    <h2 contenteditable="true">Contact</h2>
                    <div id="contact-list-container">
                        ${createContactItem('fas fa-phone', 'Phone').outerHTML}
                        ${createContactItem('fas fa-envelope', 'email@example.com').outerHTML}
                    </div>
                    <button class="add-item-btn add-contact-btn"><i class="fas fa-plus"></i> Add contact</button>`;
                break;
            case 'about':
                 needsTitleToggle = true;
                 contentHtml = `<h2 contenteditable="true">About Me</h2><div contenteditable="true"><p>${defaultSizeSpanStart}Tell something about yourself...${defaultSizeSpanEnd}</p></div>`;
                break;
            case 'experience':
                 needsTitleToggle = true;
                 block.classList.add('experience-block');
                 // Initial item handled by createExperienceItemHTML (which adds spans)
                 contentHtml = `
                    <h2 contenteditable="true">Experience</h2>
                    <div class="experience-items-container"> <!-- Container added -->
                        ${createExperienceItemHTML()}
                    </div>
                    <button class="add-item-btn add-experience-item-btn"><i class="fas fa-plus"></i> Add company</button>`;
                break;
             case 'education':
                 needsTitleToggle = true;
                 block.classList.add('education-block');
                 // Initial item handled by createEducationItemHTML (which adds spans)
                 contentHtml = `
                    <h2 contenteditable="true">Education</h2>
                    <div class="education-items-container">
                        ${createEducationItemHTML()}
                    </div>
                    <button class="add-item-btn add-education-item-btn"><i class="fas fa-plus"></i> Add institution</button>`;
                break;
            case 'skills':
                 needsTitleToggle = true;
                 contentHtml = `<h2 contenteditable="true">Skills</h2><div contenteditable="true"><p>${defaultSizeSpanStart}List your skills...${defaultSizeSpanEnd}</p></div>`;
                break;
            case 'languages':
                 needsTitleToggle = true;
                 // Items handled by createLanguageItem (which adds spans)
                 contentHtml = `
                    <h2 contenteditable="true">Languages</h2>
                    <div id="language-list">
                       ${createLanguageItem("Language 1", 3, "(Level)").outerHTML}
                    </div>
                    <button class="add-item-btn add-language-btn"><i class="fas fa-plus"></i> Add language</button>`;
                break;
            case 'other':
                 needsTitleToggle = true;
                 contentHtml = `<h2 contenteditable="true">Other</h2><div contenteditable="true"><p>${defaultSizeSpanStart}Additional information...${defaultSizeSpanEnd}</p></div>`;
                break;
            case 'custom':
                 needsTitleToggle = true;
                 contentHtml = `<h2 contenteditable="true">New Heading</h2><div contenteditable="true"><p>${defaultSizeSpanStart}Your custom block text...${defaultSizeSpanEnd}</p></div>`;
                break;
            default:
                 console.error("Unknown block type:", type);
                 return null; // Return null for unknown types
        }

        // --- Generate Controls HTML ---
        let controlsHtml = '<div class="block-controls">';
        if (needsTitleToggle) {
            controlsHtml += `<button class="control-btn toggle-title" title="Toggle block title visibility"><i class="fas fa-heading"></i></button>`;
        }
        if (needsDelete) {
            controlsHtml += `<button class="control-btn delete-block" title="Delete block"><i class="fas fa-trash-alt"></i></button>`;
        }
        controlsHtml += '</div>';
        if (controlsHtml === '<div class="block-controls"></div>') { controlsHtml = ''; }

        // Combine controls and content
        block.innerHTML = controlsHtml + contentHtml;

        // --- Add Delete Buttons to Initial Items (Experience/Education) ---
        if (type === 'experience') {
            block.querySelectorAll('.experience-items-container > .experience-item').forEach(item => {
                 if (!item.querySelector('.delete-experience-item')) {
                     const deleteBtn = document.createElement('button');
                     deleteBtn.className = 'control-btn delete-item delete-experience-item';
                     deleteBtn.title = 'Delete company';
                     deleteBtn.innerHTML = '<i class="fas fa-times"></i>';
                     const header = item.querySelector('.experience-header');
                     if (header) header.appendChild(deleteBtn);
                 }
            });
            // Add delete for initial position(s)
            block.querySelectorAll('.positions-list .position-entry').forEach(pos => {
                 if (!pos.querySelector('.delete-position-entry')) {
                     const deletePosBtn = document.createElement('button');
                     deletePosBtn.className = 'control-btn delete-item delete-position-entry';
                     deletePosBtn.title = 'Delete position';
                     deletePosBtn.innerHTML = '<i class="fas fa-times"></i>';
                     const pTag = pos.querySelector('p');
                     if (pTag) pTag.appendChild(deletePosBtn);
                 }
            });
        }

        if (type === 'education') {
            block.querySelectorAll('.education-items-container > .education-item').forEach(item => {
                 if (!item.querySelector('.delete-education-item')) {
                     const deleteBtn = document.createElement('button');
                     deleteBtn.className = 'control-btn delete-item delete-education-item';
                     deleteBtn.title = 'Delete institution';
                     deleteBtn.innerHTML = '<i class="fas fa-times"></i>';
                     const header = item.querySelector('.education-header');
                     if (header) header.appendChild(deleteBtn);
                }
            });
        }

        return block;
    }

        /** Закрывает все открытые дропдауны добавления блоков в секциях */
        function closeAllSectionDropdowns() {
            document.querySelectorAll('.section-add-block-dropdown.show').forEach(menu => {
                menu.classList.remove('show');
            });
            // console.log("[Dropdown] Закрыты все дропдауны добавления блоков секций.");
        }

        // (ШАГ 10) ДОБАВИТЬ ЭТУ ФУНКЦИЮ
        /**
         * Обновляет ширину колонок для конкретной секции
         * @param {string} sliderValue - Значение ползунка (процент)
         * @param {HTMLElement} leftColumn - Левая колонка секции
         * @param {HTMLElement} rightColumn - Правая колонка секции
         * @param {HTMLElement} valueDisplay - Span для отображения значения
         */
        function updateSectionColumnWidths(sliderValue, leftColumn, rightColumn, valueDisplay) {
            if (!leftColumn || !rightColumn) {
                // console.warn("Не найдены обе колонки для обновления ширины в секции.");
                return;
            }
            const leftWidth = parseInt(sliderValue, 10);

            if (valueDisplay) {
                valueDisplay.textContent = `${leftWidth}%`;
            }
            leftColumn.style.flexGrow = '0';
            leftColumn.style.flexShrink = '0';
            leftColumn.style.flexBasis = `${leftWidth}%`;
            leftColumn.style.minWidth = '0';
            rightColumn.style.flexGrow = '1';
            rightColumn.style.flexShrink = '1';
            rightColumn.style.flexBasis = '0%';
            rightColumn.style.minWidth = '0';
            // console.log(`[Section Width Update] Обновлена ширина колонок: Left ${leftWidth}%`);
        }
        // --- КОНЕЦ НОВОГО БЛОКА ВСПОМОГАТЕЛЬНЫХ ФУНКЦИЙ ---

        /**
         * Creates HTML string for a single position entry within an experience item.
         * @param {string} position - Default position title.
         * @param {string} dates - Default work dates.
         * @returns {string} HTML string for the position entry.
         */
        function createPositionEntryHTML(position = "Position", dates = "Dates") {
             // Returns a string, not an element directly anymore to be used in createExperienceItemHTML
             return `
                 <div class="position-entry">
                     <p>
                         <span contenteditable="true" class="job-position"><span class="font-size-16">${position}</span></span> |
                         <span contenteditable="true" class="work-dates"><span class="font-size-16">${dates}</span></span>
                         <button class="control-btn delete-item delete-position-entry" title="Delete position"><i class="fas fa-times"></i></button>
                     </p>
                 </div>
             `;
         }

     /**
      * Creates HTML string for a full experience item (company).
      * @param {string} company - Default company name.
      * @param {string} initialPosition - Default first position title.
      * @param {string} initialDates - Default first position dates.
      * @param {string} description - Default description text (can be HTML).
      * @returns {string} HTML string for the experience item.
      */
      function createExperienceItemHTML(company = "Company", initialPosition = "Position", initialDates = "Dates", description = "<ul><li><span class='font-size-16'>Description...</span></li></ul>") {
         // Note: Company H3 is not wrapped in default size span
         // Initial position/dates are handled by createPositionEntryHTML
         // Description default now wraps text inside li with the span
         return `
             <div class="experience-item">
                  <div class="experience-header">
                     <div class="logo-placeholder" title="Click to upload logo"><i class="fas fa-camera logo-icon-placeholder"></i><img src="" alt="Logo" class="logo-image" style="display: none;"><input type="file" accept="image/*" class="logo-input" style="display: none;"></div>
                     <div class="experience-info">
                         <h3 contenteditable="true">${company}</h3>
                         <div class="positions-list">
                              ${createPositionEntryHTML(initialPosition, initialDates)} <!-- String is inserted here -->
                         </div>
                         <button class="add-item-btn add-position-btn" style="margin-top: 5px;"><i class="fas fa-plus"></i> Add position</button>
                      </div>
                      <!-- Delete button for the company item is added by createBlockByType -->
                 </div>
                 <div class="experience-details" contenteditable="true">${description}</div>
             </div>`;
      }

     /**
      * Creates HTML string for a full education item.
      * @param {string} institution - Default institution name.
      * @param {string} degree - Default degree/specialty.
      * @param {string} years - Default study years.
      * @param {string} description - Default description text (can be HTML).
      * @returns {string} HTML string for the education item.
      */
     function createEducationItemHTML(institution = "Institution", degree = "Degree/Major", years = "Years", description = "<p><span class='font-size-16'>Description...</span></p>") {
         // Note: Institution H3 is not wrapped
         // Degree and Years are wrapped
         // Description default is wrapped
         return `
            <div class="education-item">
                <div class="education-header">
                    <div class="logo-placeholder" title="Click to upload logo"><i class="fas fa-camera logo-icon-placeholder"></i><img src="" alt="Logo" class="logo-image" style="display: none;"><input type="file" accept="image/*" class="logo-input" style="display: none;"></div>
                    <div class="education-info">
                         <h3 contenteditable="true">${institution}</h3>
                         <p><span contenteditable="true" class="degree"><span class="font-size-16">${degree}</span></span> | <span contenteditable="true" class="study-years"><span class="font-size-16">${years}</span></span></p>
                     </div>
                      <!-- Delete button for the education item is added by createBlockByType -->
                </div>
                <div class="education-details" contenteditable="true">${description}</div>
            </div>`;
     }

     /**
      * Creates HTML for a language item.
      * @param {string} name - Default language name.
      * @param {number} level - Default proficiency level (1-6).
      * @param {string} proficiency - Default proficiency text.
      * @returns {HTMLElement} The created language item element.
      */
     function createLanguageItem(name = "New Language", level = 1, proficiency = "(Level)") {
         const item = document.createElement('div');
         item.className = 'language-item';
         const dotsHtml = Array(6).fill(0).map((_, i) =>
             `<span class="level-dot ${i < level ? 'filled' : ''}"></span>`
         ).join('');
         item.innerHTML = `
              <span contenteditable="true" class="language-name"><span class="font-size-16">${name}</span></span>
              <div class="language-level-control" data-level="${level}" title="Click to select level">${dotsHtml}</div>
              <span contenteditable="true" class="language-proficiency"><span class="font-size-16">${proficiency}</span></span>
              <button class="control-btn delete-item delete-language" title="Delete language"><i class="fas fa-times"></i></button>
         `;
         return item;
     }


    // --- Управление Блоком Контактов ---
    const availableIcons = [ 'fas fa-phone', 'fas fa-mobile-alt', 'fas fa-envelope', 'fas fa-at', 'fas fa-map-marker-alt', 'fas fa-globe', 'fas fa-link', 'fab fa-linkedin', 'fab fa-github', 'fab fa-gitlab', 'fab fa-twitter', 'fab fa-facebook', 'fab fa-instagram', 'fab fa-telegram', 'fab fa-whatsapp', 'fab fa-skype', 'fas fa-briefcase', 'fas fa-user', 'fas fa-home', 'fas fa-birthday-cake'];

    function populateIconPicker() {
        if (!iconPickerList) return;
        iconPickerList.innerHTML = '';
        availableIcons.forEach(iconClass => {
            const btn = document.createElement('button');
            btn.className = 'icon-picker-button';
            btn.dataset.icon = iconClass;
            btn.innerHTML = `<i class="${iconClass}"></i>`;
            btn.title = iconClass.replace(/fa[brs]? fa-/,''); // Показать название иконки
            iconPickerList.appendChild(btn);
        });
    }

    // Открытие выбора иконки
    resumeContainer.addEventListener('click', (event) => {
        const changeIconButton = closest(event.target, '.change-icon-btn');
        if (changeIconButton) {
            currentContactIconBtn = changeIconButton;
            populateIconPicker();
            showElement(iconPickerModal);
        }
    });

    // Выбор иконки в модальном окне
    if(iconPickerList) {
        iconPickerList.addEventListener('click', (event) => {
            const iconButton = closest(event.target, '.icon-picker-button');
            if (iconButton && currentContactIconBtn) {
                const newIconClass = iconButton.dataset.icon;
                const iconElement = currentContactIconBtn.querySelector('i');
                if (iconElement) {
                    iconElement.className = `${newIconClass} icon`;
                }
                closeIconPicker();
            }
        });
    }

    // Закрытие модального окна
    function closeIconPicker() {
        hideElement(iconPickerModal);
        currentContactIconBtn = null;
    }
    if (iconPickerModal) {
        iconPickerModal.addEventListener('click', (event) => {
            // Закрытие по клику на фон или крестик
            if (event.target === iconPickerModal || closest(event.target, '.modal-close')) {
                closeIconPicker();
            }
        });
         // Закрытие по Esc
         document.addEventListener('keydown', (event) => {
             if (event.key === 'Escape' && iconPickerModal.style.display !== 'none') {
                 closeIconPicker();
             }
         });
    }

    // Удаление контакта
    resumeContainer.addEventListener('click', (event) => {
        const deleteContactButton = closest(event.target, '.delete-contact');
        if (deleteContactButton) {
            const contactItem = closest(deleteContactButton, '.contact-item');
            if (contactItem) {
                contactItem.style.transition = 'opacity 0.3s ease-out';
                contactItem.style.opacity = '0';
                setTimeout(() => contactItem.remove(), 300);
            }
        }
    });

    /**
     * Creates HTML for a contact item.
     * @param {string} iconClass - Font Awesome icon classes.
     * @param {string} text - Default text content.
     * @returns {HTMLElement} The created contact item element.
     */
    function createContactItem(iconClass = 'fas fa-link', text = 'New contact') {
        const item = document.createElement('div');
        item.className = 'contact-item';
        item.innerHTML = `
            <button class="control-btn change-icon-btn" title="Change icon"><i class="${iconClass} icon"></i></button>
            <span class="contact-text" contenteditable="true"><span class="font-size-16">${text}</span></span>
            <button class="control-btn delete-item delete-contact" title="Delete contact"><i class="fas fa-times"></i></button>
        `;
        return item;
    }
 

    // --- Обработчики для модального окна подтверждения удаления ---
   // --- Updated Delete Confirmation Logic ---
   if (confirmDeleteBtn && deleteConfirmModal) {
       confirmDeleteBtn.addEventListener('click', () => { // KEEP THE LISTENER STRUCTURE
           // --- START REPLACEMENT ---
           const blockToRemove = blockToDelete; // Get potential block
           const sectionToRemove = sectionToDelete; // Get potential section

           deleteConfirmModal.style.display = 'none'; // Hide modal

           if (sectionToRemove) { // PRIORITIZE SECTION DELETION
               removeSection(sectionToRemove); // Use the animated removal function
               // sectionToDelete is reset inside removeSection on success
           } else if (blockToRemove) { // If not deleting section, try deleting block
               // Optional: Add animation for block removal
               blockToRemove.style.transition = 'opacity 0.3s ease-out, transform 0.3s ease-out';
               blockToRemove.style.opacity = '0';
               blockToRemove.style.transform = 'scale(0.95)';
               setTimeout(() => {
                   if (blockToRemove.parentNode) {
                       blockToRemove.remove();
                       updateAddSectionButtons();
                   }
                   // Reset blockToDelete only if it was this block
                   if (blockToDelete === blockToRemove) blockToDelete = null;
               }, 300);
           }

           // Ensure variables are reset if deletion didn't happen or failed
           // (sectionToDelete should be handled by removeSection, but reset block just in case)
           if (!sectionToRemove && blockToDelete === blockToRemove) {
                blockToDelete = null; // Reset if block wasn't removed via animation timeout
           }
           if (!blockToRemove && sectionToDelete === sectionToRemove){
                sectionToDelete = null; // Reset if section wasn't removed
           }
           // Final safety reset if something went wrong
            blockToDelete = null;
            sectionToDelete = null;


           // --- END REPLACEMENT ---
       }); // KEEP THE CLOSING ); of addEventListener
   }

    // Функция для закрытия окна
    // --- Updated Modal Closing Logic ---

    // Define the function to close the delete modal and reset state
    const closeTheDeleteModal = () => {
        blockToDelete = null; // Always reset block reference
        sectionToDelete = null; // Always reset section reference
        if (deleteConfirmModal) {
             deleteConfirmModal.style.display = 'none';
             // Reset modal text to default (for blocks)
             const modalText = deleteConfirmModal.querySelector('p');
             if (modalText) {
                 modalText.textContent = "Are you sure you want to delete this block?";
             }
        }
    };

    // Re-assign listeners using the new function

    // Assign to Cancel button (ensure cancelDeleteBtn is defined globally or find it here)
    if (cancelDeleteBtn) {
        cancelDeleteBtn.onclick = closeTheDeleteModal;
    }
    // Assign to 'X' button (ensure closeDeleteModalBtn is defined globally or find it here)
    if (closeDeleteModalBtn) {
        closeDeleteModalBtn.onclick = closeTheDeleteModal;
    }

    // Assign to background click and Escape key (ensure deleteConfirmModal is defined globally)
    if (deleteConfirmModal) {
         // Background click
         deleteConfirmModal.addEventListener('click', (event) => {
             // Only close if the click is directly on the modal backdrop
             if (event.target === deleteConfirmModal) {
                 closeTheDeleteModal();
             }
         });

         // Escape key handler (defined separately for clarity)
         const closeDeleteModalOnEscape = (event) => {
            // Check if modal is visible and Escape was pressed
            if (event.key === 'Escape' && deleteConfirmModal.style.display === 'block') {
                closeTheDeleteModal();
            }
         };
         // Remove potential old listener before adding new one
         // document.removeEventListener('keydown', oldEscapeListenerFunction); // If you had one named
         document.addEventListener('keydown', closeDeleteModalOnEscape);
    }

    // --- Обработчики для модального окна ввода URL ---

// Функция для применения URL и закрытия окна
const applyUrlAndClose = () => {
    const url = urlInput.value.trim(); // Получаем URL и убираем пробелы
    const urlInputModal = document.getElementById('urlInputModal');

    console.log("[applyUrlAndClose] Попытка применить URL:", url);

    if (url && url !== 'https://') {
        console.log("   - URL валиден. Восстановление выделения...");
        // 1. Восстанавливаем выделение
        if (restoreFocusAndSelection()) {
            // 2. Выполняем команду СРАЗУ ЖЕ после восстановления
            setTimeout(() => { // Даем время на восстановление DOM/selection
                try {
                    console.log("   - Выполнение document.execCommand('createLink')...");
                    document.execCommand('styleWithCSS', false, true); // На всякий случай
                    const success = document.execCommand('createLink', false, url);
                    console.log("   - Команда createLink выполнена. Успех:", success);

                    // 3. Обновляем тулбар
                    const activeEditable = document.activeElement?.closest('[contenteditable=true]');
                     if (activeEditable) updateToolbarState(activeEditable);

                } catch (e) {
                    console.error("   - Ошибка при выполнении execCommand('createLink'):", e);
                } finally {
                     // Сбрасываем savedRange после использования (опционально, но может быть безопаснее)
                     // savedRange = null;
                     if (urlInputModal) urlInputModal.style.display = 'none';
                }
            }, 10); // Короткая задержка
        } else {
            console.warn("   - Не удалось восстановить выделение. Команда createLink не выполнена.");
            if (urlInputModal) urlInputModal.style.display = 'none';
        }
    } else if (!url || url === 'https://') {
         console.log("   - URL пуст или дефолтный. Попытка удалить ссылку (unlink)...");
         // Если URL пустой или дефолтный, удаляем ссылку
         if (restoreFocusAndSelection()) {
             setTimeout(() => {
                 try {
                     console.log("   - Выполнение document.execCommand('unlink')...");
                     document.execCommand('styleWithCSS', false, true);
                     const success = document.execCommand('unlink', false, null);
                     console.log("   - Команда unlink выполнена. Успех:", success);
                     const activeEditable = document.activeElement?.closest('[contenteditable=true]');
                     if (activeEditable) updateToolbarState(activeEditable);
                 } catch(e) {
                     console.error("   - Ошибка при выполнении execCommand('unlink'):", e);
                 } finally {
                      // savedRange = null;
                      if (urlInputModal) urlInputModal.style.display = 'none';
                 }
             }, 10);
         } else {
             console.warn("   - Не удалось восстановить выделение. Команда unlink не выполнена.");
             if (urlInputModal) urlInputModal.style.display = 'none';
         }
    }
};

// Функция для закрытия окна и восстановления фокуса/выделения
const closeTheUrlModal = () => {
    const urlInputModal = document.getElementById('urlInputModal');
    console.log("[closeTheUrlModal] Закрытие модального окна URL, восстановление фокуса/выделения...");
    if (urlInputModal) urlInputModal.style.display = 'none';
    restoreFocusAndSelection(); // Восстанавливаем выделение при отмене/закрытии
    // savedRange = null; // Сбрасываем после отмены
};

// Кнопка "Применить"
if (confirmUrlBtn) {
    confirmUrlBtn.removeEventListener('click', applyUrlAndClose); // Удаляем старый, если был
    confirmUrlBtn.addEventListener('click', applyUrlAndClose);
}

// Кнопка "Отмена"
if (cancelUrlBtn) {
    cancelUrlBtn.removeEventListener('click', closeTheUrlModal); // Удаляем старый
    cancelUrlBtn.addEventListener('click', closeTheUrlModal);
}

// Крестик закрытия
if (closeUrlModalBtn) {
    closeUrlModalBtn.removeEventListener('click', closeTheUrlModal); // Удаляем старый
    closeUrlModalBtn.addEventListener('click', closeTheUrlModal);
}

// Нажатие Enter/Escape в поле ввода
if (urlInput) {
    // Удаляем предыдущие обработчики keydown, чтобы избежать дублирования
    // (Лучше всего это делать с именованной функцией, но для примера так)
    // urlInput.replaceWith(urlInput.cloneNode(true)); // Простой способ удалить все слушатели
    // urlInput = document.getElementById('urlInput'); // Получаем ссылку на новый элемент

    urlInput.addEventListener('keydown', (event) => {
        if (event.key === 'Enter' || event.keyCode === 13) {
            event.preventDefault(); // Предотвращаем стандартное поведение Enter
            applyUrlAndClose(); // Применяем URL
        } else if (event.key === 'Escape' || event.keyCode === 27) {
             closeTheUrlModal(); // Закрываем по Escape прямо из поля ввода
        }
    });
}

// Закрытие по клику на фон и Escape (глобально)
if (urlInputModal) {
     urlInputModal.addEventListener('click', (event) => {
         if (event.target === urlInputModal) {
             closeTheUrlModal();
         }
     });
     // Глобальный слушатель Escape (убедитесь, что он не конфликтует с другими)
     document.addEventListener('keydown', (event) => {
         if (event.key === 'Escape' && urlInputModal.style.display === 'block') {
             closeTheUrlModal();
         }
     });
}

    // --- Event Listener for Print Button ---
    if (printPdfBtn) {
        printPdfBtn.addEventListener('click', () => {
            console.log("Print button clicked. Triggering window.print()...");
            // The browser will handle the print dialog.
            // CSS (@page and @media print) will suggest the layout.
            window.print();
        });
    }

    updateAddSectionButtons();


     window.createSectionHTML = createSectionHTML;
    window.updateAddSectionButtons = updateAddSectionButtons;
    window.initializeInnerSortable = initializeInnerSortable;
    window.createBlockByType = createBlockByType;
    window.createContactItem = createContactItem; // Needed by import
    window.createLanguageItem = createLanguageItem; // Needed by import
    window.createExperienceItemHTML = createExperienceItemHTML; // Needed by import
    window.createEducationItemHTML = createEducationItemHTML; // Needed by import
    window.createPositionEntryHTML = createPositionEntryHTML; 
    window.updateSectionColumnWidths = updateSectionColumnWidths; // Needed by import
    // Expose the logo handler if it's defined within this scope and needed globally
    if (typeof handleLogoChange === 'function') {
         window.handleLogoChange = handleLogoChange;
    }
    // Add any other functions from script.js that importExport.js might need
    // For example, if you need `closest` or similar helpers globally:
    // window.closest = closest;

    console.log("Helper functions exposed to window object for import/export.");

}); // Конец DOMContentLoaded