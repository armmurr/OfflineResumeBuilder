// importExport.js

document.addEventListener('DOMContentLoaded', () => {
    const resumeContainer = document.getElementById('resumeToExport');
    const exportBtn = document.getElementById('exportJsonBtn');
    const importBtn = document.getElementById('importJsonBtn');
    const fileInput = document.getElementById('importFile');

    if (!resumeContainer || !exportBtn || !importBtn || !fileInput) {
        console.error("Не найдены необходимые элементы для импорта/экспорта.");
        return;
    }

    // --- EXPORT FUNCTIONALITY ---

    exportBtn.addEventListener('click', () => {
        try {
            const resumeData = extractResumeData();
            const jsonString = JSON.stringify(resumeData, null, 2); // Pretty print JSON
            downloadJson(jsonString, 'resume_data.json');
            console.log("Резюме успешно экспортировано.");
        } catch (error) {
            console.error("Ошибка при экспорте резюме:", error);
            alert("ПThere was an error exporting your resume. See console for details.");
        }
    });

    function extractResumeData() {
        const data = {
            sections: []
        };

        resumeContainer.querySelectorAll(':scope > .resume-section').forEach(sectionEl => {
            const sectionData = {
                type: sectionEl.classList.contains('resume-section--two-column') ? 'two-column' : 'full-width',
                styles: {
                    fontFamily: sectionEl.style.fontFamily || getComputedStyle(sectionEl).fontFamily.split(',')[0].replace(/['"]/g, '').trim(),
                    h2UnderlineColor: sectionEl.style.getPropertyValue('--section-h2-underline-color') || '#4a90e2' // Default if not set
                },
                columns: []
            };

            if (sectionData.type === 'two-column') {
                const leftCol = sectionEl.querySelector('.column-left');
                sectionData.leftColumnWidth = leftCol ? parseInt(leftCol.style.flexBasis) || 50 : 50;
            }

            // Find column containers (works for both types)
            const columnContainers = sectionEl.querySelectorAll(':scope > .resume-columns-container > .resume-column, :scope > .resume-full-width-container');

            columnContainers.forEach(colEl => {
                const columnData = {
                    blocks: []
                };
                colEl.querySelectorAll(':scope > .resume-block').forEach(blockEl => {
                    const blockData = extractBlockData(blockEl);
                    if (blockData) {
                        columnData.blocks.push(blockData);
                    }
                });
                sectionData.columns.push(columnData);
            });
            data.sections.push(sectionData);
        });

        return data;
    }

    // importExport.js

    function extractBlockData(blockEl) {
        const type = blockEl.dataset.type;
        if (!type) return null;

        const blockData = {
            type: type,
            classes: Array.from(blockEl.classList).filter(cls => cls !== 'resume-block' && cls !== 'draggable' && !cls.startsWith('experience-block') && !cls.startsWith('education-block') && !cls.startsWith('block-sortable') && cls !== 'is-spanned'), // Filter out internal/dynamic classes
            content: {},
            items: [] // Initialize items array
        };

        // --- Extract common elements (like title) ---
        const titleEl = blockEl.querySelector(':scope > h2'); // Select direct child H2
        if (titleEl) {
            blockData.title = titleEl.outerHTML; // Save H2 tag and content
        }

        // --- Extract type-specific content ---
        switch (type) {
            case 'name':
                blockData.content.name = blockEl.querySelector('h1')?.outerHTML || '<h1>Имя</h1>';
                blockData.content.title = blockEl.querySelector('.job-title')?.outerHTML || '<p class="job-title">Должность</p>';
                break;
            case 'contact':
                blockEl.querySelectorAll('#contact-list-container .contact-item').forEach(itemEl => {
                    const iconEl = itemEl.querySelector('.change-icon-btn i');
                    const textEl = itemEl.querySelector('.contact-text');
                    blockData.items.push({
                        icon: iconEl ? Array.from(iconEl.classList).filter(c => c !== 'icon').join(' ') : 'fas fa-link',
                        text: textEl?.innerHTML || '' // Save innerHTML of the editable span
                    });
                });
                break;
            case 'about':
            case 'skills':
            case 'other':
            case 'custom':
                const contentDiv = blockEl.querySelector(':scope > div[contenteditable="true"]');
                blockData.content.main = contentDiv?.innerHTML || '<p></p>';
                break;

            case 'experience':
                // --- START FIX for Experience Export ---
                // 1. Find the container for experience items
                const expItemsContainer = blockEl.querySelector('.experience-items-container');
                if (expItemsContainer) {
                    // 2. Query for items *inside* the container
                    expItemsContainer.querySelectorAll(':scope > .experience-item').forEach(itemEl => { // Select direct children items OF THE CONTAINER
                        const companyH3 = itemEl.querySelector('.experience-info h3');
                        const positions = [];
                        // Find all position entries within this item
                        itemEl.querySelectorAll('.positions-list .position-entry').forEach(posEl => {
                            positions.push({
                                // Save the outerHTML of the specific spans to preserve attributes and content
                                position: posEl.querySelector('.job-position')?.outerHTML || '<span class="job-position">Должность</span>',
                                dates: posEl.querySelector('.work-dates')?.outerHTML || '<span class="work-dates">Даты</span>'
                            });
                        });

                        blockData.items.push({
                            logoSrc: itemEl.querySelector('.logo-image')?.getAttribute('src') || '',
                            company: companyH3 ? companyH3.outerHTML : '<h3>Компания</h3>', // Store company H3 outerHTML
                            positions: positions, // Store array of position objects
                            details: itemEl.querySelector('.experience-details')?.innerHTML || '' // Store details innerHTML
                        });
                    });
                } else {
                     console.warn("Export Warning: '.experience-items-container' not found in experience block:", blockEl);
                }
                // --- END FIX for Experience Export ---
                break; // End case 'experience'

            case 'education':
                 // Find the container for education items
                 const eduItemsContainer = blockEl.querySelector('.education-items-container');
                 if (eduItemsContainer) {
                     // Query for items *inside* the container
                     eduItemsContainer.querySelectorAll(':scope > .education-item').forEach(itemEl => { // Select direct children items OF THE CONTAINER
                         blockData.items.push({
                             logoSrc: itemEl.querySelector('.logo-image')?.getAttribute('src') || '',
                             header: {
                                 // Save outerHTML to preserve attributes/content
                                 institution: itemEl.querySelector('.education-info h3')?.outerHTML || '<h3>Учреждение</h3>',
                                 degree: itemEl.querySelector('.degree')?.outerHTML || '<span class="degree">Степень</span>',
                                 years: itemEl.querySelector('.study-years')?.outerHTML || '<span class="study-years">Годы</span>'
                             },
                             details: itemEl.querySelector('.education-details')?.innerHTML || '' // Store details innerHTML
                         });
                     });
                 } else {
                      console.warn("Export Warning: '.education-items-container' not found in education block:", blockEl);
                 }
                 break; // End case 'education'

            case 'languages':
                blockEl.querySelectorAll('#language-list .language-item').forEach(itemEl => {
                    blockData.items.push({
                        // Save innerHTML for name/proficiency to capture potential formatting spans
                        name: itemEl.querySelector('.language-name')?.innerHTML || '',
                        level: parseInt(itemEl.querySelector('.language-level-control')?.dataset.level || '0'),
                        proficiency: itemEl.querySelector('.language-proficiency')?.innerHTML || ''
                    });
                });
                break;

            default:
                console.warn("Неизвестный тип блока при экспорте:", type, blockEl);
                return null; // Don't save unknown block types
        }
        return blockData;
    }
    function downloadJson(jsonString, filename) {
        const blob = new Blob([jsonString], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    // --- IMPORT FUNCTIONALITY ---

    importBtn.addEventListener('click', () => {
        fileInput.click(); // Open file dialog
    });

    fileInput.addEventListener('change', (event) => {
        const file = event.target.files[0];
        if (!file) {
            return;
        }
        if (!file.name.endsWith('.json')) {
             alert("Please select a JSON file.");
             event.target.value = null; // Reset input
             return;
        }

        const reader = new FileReader();

        reader.onload = (e) => {
            try {
                const jsonString = e.target.result;
                const resumeData = JSON.parse(jsonString);
                rebuildResume(resumeData);
                console.log("Резюме успешно импортировано.");
                 
            } catch (error) {
                console.error("Ошибка при импорте резюме:", error);
                alert("There was an error importing your resume. The file may be corrupted or in an invalid format. See console for details.");
            } finally {
                 event.target.value = null; // Reset input value regardless of success/failure
            }
        };

        reader.onerror = (e) => {
             console.error("Ошибка чтения файла:", e);
             alert("Failed to read file.");
             event.target.value = null; // Reset input
        };

        reader.readAsText(file);
    });

    // Inside importExport.js

    /**
     * Clears the existing resume content and rebuilds it based on the provided data object.
     * @param {object} data - The resume data object parsed from JSON.
     */
    function rebuildResume(data) {
        // --- 1. Validate Input Data ---
        if (!data || !Array.isArray(data.sections)) {
            throw new Error("Invalid JSON data format: 'sections' array is missing or data is null.");
        }

        // --- 2. Clear Existing Content and Sortable Instances ---
        const resumeContainer = document.getElementById('resumeToExport');
        if (!resumeContainer) {
            console.error("Resume container #resumeToExport not found during rebuild.");
            return; // Cannot proceed
        }

        // Destroy existing Sortable instances on block containers before clearing
        resumeContainer.querySelectorAll('.resume-column, .resume-full-width-container').forEach(container => {
             if (container.sortableInstance) {
                 try {
                     container.sortableInstance.destroy();
                     console.log("Destroyed Sortable instance for:", container);
                 } catch(e) {
                     console.error("Error destroying Sortable instance:", e, container);
                 }
                 delete container.sortableInstance; // Remove reference
             }
        });
        // Clear the main resume container HTML
        resumeContainer.innerHTML = '';
        console.log("Cleared existing resume content and Sortable instances.");

        // --- 3. Rebuild Sections ---
        data.sections.forEach((sectionData, sectionIndex) => {
            console.log(`Rebuilding Section ${sectionIndex}, type: ${sectionData.type}`);

            // Ensure helper functions are available
            if (typeof createSectionHTML !== 'function' || typeof buildBlockFromData !== 'function' ) {
                 console.error(`Essential function (createSectionHTML or buildBlockFromData) not found. Cannot rebuild section ${sectionIndex}.`);
                 return; // Skip this section
             }

             // Create the basic section structure using the helper function
             // createSectionHTML is now responsible for adding mouseenter/mouseleave listeners
             const newSection = createSectionHTML(sectionData.type);
             if (!newSection) {
                 console.error(`Failed to create HTML for section ${sectionIndex}.`);
                 return; // Skip if creation failed
             }

             // --- Apply Section Styles ---
             try {
                 if (sectionData.styles?.fontFamily) {
                     newSection.style.fontFamily = sectionData.styles.fontFamily;
                     const fontSelect = newSection.querySelector('.section-font-select');
                     // Ensure font options are populated before setting value
                     if (fontSelect) {
                         // populateFontDropdown(fontSelect, "Section Font"); // Uncomment if needed
                         fontSelect.value = sectionData.styles.fontFamily;
                         // Verify value was set
                         if (fontSelect.value !== sectionData.styles.fontFamily) {
                             console.warn(`Section ${sectionIndex}: Font '${sectionData.styles.fontFamily}' not found in dropdown. Applied style, but select may be wrong.`);
                         }
                     }
                 }
                 if (sectionData.styles?.h2UnderlineColor) {
                     newSection.style.setProperty('--section-h2-underline-color', sectionData.styles.h2UnderlineColor);
                     const colorInput = newSection.querySelector('.section-h2-color');
                     if(colorInput) {
                         colorInput.value = sectionData.styles.h2UnderlineColor;
                     }
                 }
             } catch (styleError) {
                  console.error(`Error applying styles to section ${sectionIndex}:`, styleError);
             }

             // --- Set Column Width for Two-Column Layouts ---
             if (sectionData.type === 'two-column' && sectionData.leftColumnWidth) {
                const leftCol = newSection.querySelector('.column-left');
                const rightCol = newSection.querySelector('.column-right');
                const slider = newSection.querySelector('.section-width-slider');
                const valueDisplay = newSection.querySelector('.section-width-value');

                // Ensure all elements exist before proceeding
                if (leftCol && rightCol && slider && valueDisplay) {
                     if (typeof updateSectionColumnWidths === 'function') {
                        updateSectionColumnWidths(sectionData.leftColumnWidth.toString(), leftCol, rightCol, valueDisplay);
                        slider.value = sectionData.leftColumnWidth;
                     } else { // Fallback if function not available
                        leftCol.style.flexBasis = `${sectionData.leftColumnWidth}%`;
                        rightCol.style.flexBasis = `${100 - sectionData.leftColumnWidth}%`; // Also set right column
                        valueDisplay.textContent = `${sectionData.leftColumnWidth}%`;
                        slider.value = sectionData.leftColumnWidth;
                        console.warn(`Section ${sectionIndex}: Function updateSectionColumnWidths not found, applied basic flex-basis style.`);
                     }
                 } else {
                     console.warn(`Section ${sectionIndex}: Could not find all elements needed for two-column width adjustment (L:${!!leftCol}, R:${!!rightCol}, Slider:${!!slider}, Display:${!!valueDisplay}).`);
                 }
             }

             // --- Clear Default Content from Columns ---
             const columnElements = newSection.querySelectorAll('.resume-column, .resume-full-width-container');
             columnElements.forEach(colEl => colEl.innerHTML = ''); // Clear any template content

             // --- Populate Columns with Blocks ---
             if (Array.isArray(sectionData.columns)) {
                sectionData.columns.forEach((columnData, colIndex) => {
                    // Ensure target column exists and block data is valid
                     if (colIndex < columnElements.length && columnData && Array.isArray(columnData.blocks)) {
                         const targetColumn = columnElements[colIndex];
                         columnData.blocks.forEach((blockData, blockIndex) => {
                             console.log(`  - Rebuilding Block ${blockIndex} in Column ${colIndex}, type: ${blockData?.type}`);
                             const newBlock = buildBlockFromData(blockData); // buildBlockFromData handles block creation
                             if (newBlock) {
                                 targetColumn.appendChild(newBlock);
                             } else {
                                  console.warn(`    - Failed to build block ${blockIndex} from data:`, blockData);
                             }
                         });
                     } else {
                          console.warn(`Section ${sectionIndex}: Invalid column data or index out of bounds for column ${colIndex}.`);
                     }
                });
             } else {
                  console.warn(`Section ${sectionIndex}: 'columns' array not found or invalid.`);
             }

             // --- Append the Completed Section to the Container ---
             resumeContainer.appendChild(newSection);

             // --- Re-initialize Sortable for Blocks WITHIN this Section ---
             if (typeof initializeInnerSortable === 'function') {
                 console.log(`Initializing inner Sortable for section ${sectionIndex}...`);
                 initializeInnerSortable(newSection);
             } else {
                  console.warn(`Function initializeInnerSortable not found. Drag-and-drop for blocks in section ${sectionIndex} might not work.`);
             }

             // Mouseenter/mouseleave listeners are now added by createSectionHTML, no need to add them here.

        }); // End loop through data.sections

        // --- 4. Final Updates After All Sections are Added ---
        if (typeof updateAddSectionButtons === 'function') {
            console.log("Updating '+' add section button positions...");
            updateAddSectionButtons();
        } else {
             console.warn("Function updateAddSectionButtons not found. '+' buttons might be misplaced.");
        }

        console.log("Resume rebuild completed.");
    }

    function buildBlockFromData(blockData) {
        if (!blockData || !blockData.type) return null;
        if (typeof createBlockByType !== 'function') {
             console.error("Функция createBlockByType не найдена:", blockData.type);
             return null;
        }

        // Create basic block (createBlockByType now includes H2 for exp/edu)
        const newBlock = createBlockByType(blockData.type);
        if (!newBlock) return null;

        // Apply saved classes
        newBlock.classList.remove('title-hidden'); // Remove default if present
        if (Array.isArray(blockData.classes)) {
             blockData.classes.forEach(cls => newBlock.classList.add(cls));
        }

        // Clear default/template content *carefully*
        const titleEl = newBlock.querySelector(':scope > h2'); // Direct H2
        const contentDiv = newBlock.querySelector(':scope > div[contenteditable="true"]'); // Direct div
        const contactList = newBlock.querySelector('#contact-list-container');
        const langList = newBlock.querySelector('#language-list');
        // Find specific containers for items
        const expItemsContainer = newBlock.querySelector('.experience-items-container'); // Container for COMPANY items
        const eduItemsContainer = newBlock.querySelector('.education-items-container');
        const nameH1 = newBlock.querySelector('h1');
        const nameTitle = newBlock.querySelector('.job-title');

        // Clear lists/containers *before* populating
        if (contactList) contactList.innerHTML = '';
        if (langList) langList.innerHTML = '';
        if (expItemsContainer) expItemsContainer.innerHTML = ''; // Clear default experience item(s)
        if (eduItemsContainer) eduItemsContainer.innerHTML = ''; // Clear default education item(s)

        // --- Populate content based on type ---
        if (blockData.title && titleEl) {
             titleEl.outerHTML = blockData.title; // Restore H2 tag
        } else if (!blockData.title && titleEl) {
             // If title was saved as null/undefined but exists in template, remove it
             // Or toggle hidden class if appropriate? For now, let's assume absence means remove or hide.
             // Safter: Check if 'title-hidden' class dictates presence
              if (!blockData.classes?.includes('title-hidden')) {
                 titleEl.style.display = 'none'; // Hide if not explicitly saved and not hidden
              }
        }

        switch (blockData.type) {
            case 'name':
                if (nameH1 && blockData.content?.name) nameH1.outerHTML = blockData.content.name;
                if (nameTitle && blockData.content?.title) nameTitle.outerHTML = blockData.content.title;
                break;
            case 'contact':
                if (contactList && Array.isArray(blockData.items)) {
                     blockData.items.forEach(itemData => {
                         // Need createContactItem function available
                         if (typeof createContactItem === 'function') {
                              const contactItem = createContactItem(itemData.icon, itemData.text);
                              contactList.appendChild(contactItem);
                         } else { console.error("Функция createContactItem не найдена."); }
                     });
                }
                break;
            case 'about':
            case 'skills':
            case 'other':
            case 'custom':
                if (contentDiv && blockData.content?.main) contentDiv.innerHTML = blockData.content.main;
                break;
            case 'experience':
                        if (!expItemsContainer) {
                            console.error("Import Error: '.experience-items-container' not found in experience block template.");
                            break;
                        }
                        // Container was already cleared

                        if (Array.isArray(blockData.items)) {
                            blockData.items.forEach(itemData => { // itemData represents one company
                                if (typeof createExperienceItemHTML !== 'function' || typeof createPositionEntryHTML !== 'function') {
                                    console.error("Import Error: 'createExperienceItemHTML' or 'createPositionEntryHTML' function not found.");
                                    return; // Skip this company item if helpers missing
                                }

                                // Create the basic company item structure using the helper
                                const itemHtmlString = createExperienceItemHTML(); // Returns HTML string
                                const tempDiv = document.createElement('div');
                                tempDiv.innerHTML = itemHtmlString;
                                const itemEl = tempDiv.querySelector('.experience-item'); // Get the actual element

                                if (!itemEl) {
                                    console.error("Import Error: Failed to create experience item element from HTML string.");
                                    return; // Skip this item
                                }

                                // --- Populate Company Level Info (logo, company H3, details) ---
                                // (Keep the existing population logic for these parts)
                                const logoImg = itemEl.querySelector('.logo-image');
                                const logoPlaceholder = itemEl.querySelector('.logo-placeholder');
                                const logoIcon = itemEl.querySelector('.logo-icon-placeholder');
                                if (logoImg && itemData.logoSrc) {
                                    logoImg.src = itemData.logoSrc; logoImg.style.display = 'block';
                                    if (logoIcon) logoIcon.style.display = 'none';
                                    if (logoPlaceholder) logoPlaceholder.style.borderStyle = 'solid';
                                } else if (logoImg) {
                                    logoImg.src = ""; logoImg.style.display = 'none';
                                    if(logoIcon) logoIcon.style.display = '';
                                    if(logoPlaceholder) logoPlaceholder.style.borderStyle = '';
                                }
                                const companyH3 = itemEl.querySelector('.experience-info h3');
                                if (companyH3 && itemData.company) companyH3.outerHTML = itemData.company;
                                const detailsDiv = itemEl.querySelector('.experience-details');
                                if (detailsDiv && itemData.details) detailsDiv.innerHTML = itemData.details;


                                // --- Populate Positions List ---
                                const positionsListContainer = itemEl.querySelector('.positions-list');
                                if (positionsListContainer) {
                                    positionsListContainer.innerHTML = ''; // Clear default position(s) from template
                                    if (Array.isArray(itemData.positions)) {
                                        itemData.positions.forEach(posData => {

                                            // ---- START FIX for Position Entry ----
                                            // 1. Create the HTML string for the position entry
                                            const positionEntryHtmlString = createPositionEntryHTML(); // Returns STRING

                                            // 2. Convert the string to a DOM element
                                            const tempPosDiv = document.createElement('div');
                                            tempPosDiv.innerHTML = positionEntryHtmlString.trim(); // Assign HTML string
                                            const positionEntryElement = tempPosDiv.querySelector('.position-entry'); // Get the actual ELEMENT

                                            if (!positionEntryElement) {
                                                console.error("Import Error: Failed to create position entry ELEMENT from HTML string.");
                                                return; // Skip this position if element creation failed
                                            }
                                            // ---- END FIX for Position Entry ----


                                            // Now use the 'positionEntryElement' (the actual node)
                                            const posSpan = positionEntryElement.querySelector('.job-position');
                                            const dateSpan = positionEntryElement.querySelector('.work-dates');

                                            // Restore the outerHTML of the saved spans
                                            if (posSpan && posData.position) posSpan.outerHTML = posData.position;
                                            if (dateSpan && posData.dates) dateSpan.outerHTML = posData.dates;

                                            // Ensure the delete button exists on the created element
                                            if (!positionEntryElement.querySelector('.delete-position-entry')) {
                                                const deletePosBtn = document.createElement('button');
                                                deletePosBtn.className = 'control-btn delete-item delete-position-entry';
                                                deletePosBtn.title = 'Удалить позицию';
                                                deletePosBtn.innerHTML = '<i class="fas fa-times"></i>';
                                                // Append button to the <p> tag inside the position entry
                                                const pTag = positionEntryElement.querySelector('p');
                                                if (pTag) {
                                                    pTag.appendChild(deletePosBtn);
                                                } else {
                                                    console.warn("Could not find <p> tag in position entry to append delete button.");
                                                }
                                            }

                                            // Append the populated ELEMENT to the list
                                            positionsListContainer.appendChild(positionEntryElement);
                                        });
                                    }
                                }

                                // Ensure the delete button for the COMPANY item exists
                                const companyHeader = itemEl.querySelector('.experience-header');
                                 if(companyHeader && !companyHeader.querySelector('.delete-experience-item')) {
                                     const deleteBtn = document.createElement('button');
                                     deleteBtn.className = 'control-btn delete-item delete-experience-item';
                                     deleteBtn.title = 'Удалить компанию';
                                     deleteBtn.innerHTML = '<i class="fas fa-times"></i>';
                                     companyHeader.appendChild(deleteBtn);
                                 }

                                // Append the fully populated company item INTO THE CONTAINER
                                expItemsContainer.appendChild(itemEl);
                            });
                        }
                        break; // End case 'experience':
            case 'education':
                 // Populate items into the container
                 if (eduItemsContainer && Array.isArray(blockData.items)) {
                     blockData.items.forEach(itemData => {
                          if (typeof createEducationItemHTML === 'function') {
                              const itemHtml = createEducationItemHTML( /* Use defaults */ );
                              const tempDiv = document.createElement('div');
                              tempDiv.innerHTML = itemHtml;
                              const itemEl = tempDiv.querySelector('.education-item');
                              // --- FIX HERE ---
                               if (!itemEl) return; // Use return instead of continue
                              // --- END FIX ---

                              // Populate specific parts (Keep existing population logic)
                              // ... (logo, institution, degree, years, details) ...
                               const logoImg = itemEl.querySelector('.logo-image');
                               const logoPlaceholder = itemEl.querySelector('.logo-placeholder');
                               const logoIcon = itemEl.querySelector('.logo-icon-placeholder');
                               if (logoImg && itemData.logoSrc) { /* ... logo logic ... */
                                   logoImg.src = itemData.logoSrc;
                                   logoImg.style.display = 'block';
                                   if (logoIcon) logoIcon.style.display = 'none';
                                   if (logoPlaceholder) logoPlaceholder.style.borderStyle = 'solid';
                               }
                               const instH3 = itemEl.querySelector('.education-info h3');
                               if(instH3 && itemData.header?.institution) instH3.outerHTML = itemData.header.institution;
                               const degreeSpan = itemEl.querySelector('.degree');
                               if(degreeSpan && itemData.header?.degree) degreeSpan.outerHTML = itemData.header.degree;
                               const yearsSpan = itemEl.querySelector('.study-years');
                               if(yearsSpan && itemData.header?.years) yearsSpan.outerHTML = itemData.header.years;
                               const detailsDiv = itemEl.querySelector('.education-details');
                               if(detailsDiv && itemData.details) detailsDiv.innerHTML = itemData.details;

                               // Add the delete button
                                if (!itemEl.querySelector('.delete-education-item')) {
                                    const deleteBtn = document.createElement('button');
                                    deleteBtn.className = 'control-btn delete-item delete-education-item';
                                    deleteBtn.title = 'Удалить место учебы';
                                    deleteBtn.innerHTML = '<i class="fas fa-times"></i>';
                                    const header = itemEl.querySelector('.education-header');
                                    if (header) header.appendChild(deleteBtn);
                               }

                              eduItemsContainer.appendChild(itemEl);
                          } else { console.error("Функция createEducationItemHTML не найдена."); }
                     });
                  }
                  break; // End case 'education'
            case 'languages':
                if (langList && Array.isArray(blockData.items)) {
                     blockData.items.forEach(itemData => {
                         // Need createLanguageItem function available
                         if (typeof createLanguageItem === 'function') {
                              const langItem = createLanguageItem(itemData.name, itemData.level, itemData.proficiency);
                              langList.appendChild(langItem);
                         } else { console.error("Функция createLanguageItem не найдена."); }
                     });
                }
                break;
        }

        // --- Re-attach logo change listeners (simple example) ---
        newBlock.querySelectorAll('.logo-placeholder .logo-input').forEach(input => {
             input.addEventListener('change', handleLogoChange); // Assumes handleLogoChange exists globally
        });

        return newBlock;
    }

    // Example handler needed for logos during import (must be defined globally or passed)
    // This is likely already in your script.js - make sure it's accessible
    function handleLogoChange(event) {
         const input = event.target;
         if (input.classList.contains('logo-input') && input.files && input.files[0]) {
             const file = input.files[0];
             const placeholder = input.closest('.logo-placeholder'); // Use closest from original script if needed
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
             reader.onerror = (e) => { console.error("Ошибка чтения файла:", e); alert("Failed to load image."); }
             reader.readAsDataURL(file);
         }
    }


}); // End DOMContentLoaded