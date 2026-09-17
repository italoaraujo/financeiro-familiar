'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Tag as TagIcon, X, Plus } from 'lucide-react';
import { apiRequest } from '../../lib/api';

export interface TagItem {
  id?: string;
  name: string;
  color?: string;
}

interface TagInputProps {
  value: string[];
  onChange: (tags: string[]) => void;
  familyId?: string | null;
  placeholder?: string;
  disabled?: boolean;
}

export function TagInput({
  value = [],
  onChange,
  familyId,
  placeholder = 'Adicionar tag (ex: #viagem)...',
  disabled = false,
}: TagInputProps) {
  const [inputValue, setInputValue] = useState('');
  const [availableTags, setAvailableTags] = useState<TagItem[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let isMounted = true;
    const loadTags = async () => {
      try {
        const params: any = familyId ? { familyId } : {};
        const tags = await apiRequest<TagItem[]>('/tags', { params });
        if (isMounted && Array.isArray(tags)) {
          setAvailableTags(tags);
        }
      } catch (err) {
        console.error('Falha ao carregar tags para autocomplete:', err);
      }
    };
    loadTags();
    return () => {
      isMounted = false;
    };
  }, [familyId]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const cleanTagName = (text: string) => {
    let name = text.trim();
    if (name.startsWith('#')) {
      name = name.substring(1).trim();
    }
    return name;
  };

  const addTag = (rawName: string) => {
    const name = cleanTagName(rawName);
    if (!name) return;
    if (name.length > 50) return;

    // Evita duplicatas case-insensitive
    if (!value.some((t) => t.toLowerCase() === name.toLowerCase())) {
      onChange([...value, name]);
    }
    setInputValue('');
    setIsOpen(false);
    setHighlightedIndex(-1);
  };

  const removeTag = (indexToRemove: number) => {
    if (disabled) return;
    onChange(value.filter((_, idx) => idx !== indexToRemove));
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (disabled) return;

    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      if (isOpen && highlightedIndex >= 0 && filteredSuggestions[highlightedIndex]) {
        addTag(filteredSuggestions[highlightedIndex].name);
      } else if (inputValue.trim()) {
        addTag(inputValue);
      }
    } else if (e.key === 'Backspace' && !inputValue && value.length > 0) {
      removeTag(value.length - 1);
    } else if (e.key === 'ArrowDown' && isOpen) {
      e.preventDefault();
      setHighlightedIndex((prev) =>
        prev < filteredSuggestions.length - 1 ? prev + 1 : 0
      );
    } else if (e.key === 'ArrowUp' && isOpen) {
      e.preventDefault();
      setHighlightedIndex((prev) =>
        prev > 0 ? prev - 1 : filteredSuggestions.length - 1
      );
    } else if (e.key === 'Escape') {
      setIsOpen(false);
    }
  };

  const query = cleanTagName(inputValue).toLowerCase();
  const filteredSuggestions = availableTags.filter((tag) => {
    const isAlreadySelected = value.some(
      (v) => v.toLowerCase() === tag.name.toLowerCase()
    );
    if (isAlreadySelected) return false;
    if (!query) return true;
    return tag.name.toLowerCase().includes(query);
  });

  return (
    <div ref={containerRef} className="relative w-full">
      <div
        onClick={() => inputRef.current?.focus()}
        className={`flex flex-wrap items-center gap-1.5 min-h-[42px] px-3 py-1.5 bg-slate-800 border rounded-xl transition-all cursor-text ${
          isOpen
            ? 'border-emerald-500 ring-2 ring-emerald-500/20'
            : 'border-slate-700 hover:border-slate-600'
        } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
      >
        <TagIcon className="h-4 w-4 text-slate-400 shrink-0 mr-0.5" />

        {value.map((tagName, index) => {
          const matchTag = availableTags.find(
            (t) => t.name.toLowerCase() === tagName.toLowerCase()
          );
          const chipColor = matchTag?.color || '#10b981';

          return (
            <span
              key={`${tagName}-${index}`}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-700/80 text-white border border-slate-600 shadow-sm"
            >
              <span
                className="h-2 w-2 rounded-full shrink-0"
                style={{ backgroundColor: chipColor }}
              />
              <span>#{tagName}</span>
              {!disabled && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    removeTag(index);
                  }}
                  className="text-slate-400 hover:text-rose-400 focus:outline-none p-0.5 rounded transition-colors"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </span>
          );
        })}

        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          disabled={disabled}
          placeholder={value.length === 0 ? placeholder : ''}
          onChange={(e) => {
            setInputValue(e.target.value);
            setIsOpen(true);
            setHighlightedIndex(-1);
          }}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          className="flex-1 min-w-[120px] bg-transparent text-xs sm:text-sm text-white focus:outline-none placeholder-slate-500 py-1"
        />
      </div>

      {/* Autocomplete Dropdown */}
      {isOpen && !disabled && (filteredSuggestions.length > 0 || query) && (
        <div className="absolute left-0 right-0 z-50 mt-1 max-h-56 overflow-y-auto bg-slate-900 border border-slate-700 rounded-xl shadow-2xl p-1.5 space-y-1 animate-in fade-in zoom-in-95 duration-100">
          {filteredSuggestions.length > 0 ? (
            filteredSuggestions.map((tag, idx) => (
              <button
                key={tag.id || tag.name}
                type="button"
                onClick={() => addTag(tag.name)}
                onMouseEnter={() => setHighlightedIndex(idx)}
                className={`w-full flex items-center justify-between px-3 py-2 text-xs rounded-lg transition-colors text-left ${
                  highlightedIndex === idx
                    ? 'bg-slate-800 text-white'
                    : 'text-slate-300 hover:bg-slate-800/60'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span
                    className="h-2.5 w-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: tag.color || '#10b981' }}
                  />
                  <span className="font-medium">#{tag.name}</span>
                </div>
                <span className="text-[10px] text-slate-500">Selecionar</span>
              </button>
            ))
          ) : query ? (
            <button
              type="button"
              onClick={() => addTag(inputValue)}
              className="w-full flex items-center gap-2 px-3 py-2 text-xs text-emerald-400 hover:bg-slate-800 rounded-lg transition-colors font-medium text-left"
            >
              <Plus className="h-3.5 w-3.5 shrink-0" />
              <span>Criar nova tag: <strong>#{cleanTagName(inputValue)}</strong></span>
            </button>
          ) : null}

          {query && !filteredSuggestions.some((s) => s.name.toLowerCase() === query) && filteredSuggestions.length > 0 && (
            <div className="border-t border-slate-800 pt-1 mt-1">
              <button
                type="button"
                onClick={() => addTag(inputValue)}
                className="w-full flex items-center gap-2 px-3 py-2 text-xs text-emerald-400 hover:bg-slate-800 rounded-lg transition-colors font-medium text-left"
              >
                <Plus className="h-3.5 w-3.5 shrink-0" />
                <span>Criar nova tag: <strong>#{cleanTagName(inputValue)}</strong></span>
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
