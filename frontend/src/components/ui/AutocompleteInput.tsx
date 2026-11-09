'use client';

import React, { useState, useEffect, useRef, useCallback, useId } from 'react';
import { apiRequest } from '../../lib/api';
import { Loader2 } from 'lucide-react';

interface AutocompleteInputProps {
  value: string;
  onChange: (value: string) => void;
  type: 'EXPENSE' | 'INCOME' | 'TRANSFER';
  familyId?: string | null;
  placeholder?: string;
  required?: boolean;
  className?: string;
  disabled?: boolean;
  autoFocus?: boolean;
}

// Cache em memória compartilhado na sessão para buscas recentes (TTL 5 minutos)
const descriptionCache = new Map<string, { data: string[]; timestamp: number }>();
const CACHE_TTL_MS = 5 * 60 * 1000;

export function AutocompleteInput({
  value,
  onChange,
  type,
  familyId,
  placeholder,
  required = false,
  className = '',
  disabled = false,
  autoFocus = false,
}: AutocompleteInputProps) {
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const listboxId = useId();

  const getCacheKey = useCallback(
    (searchTerm: string) => {
      const scope = familyId || 'personal';
      return `${scope}:${type}:${searchTerm.trim().toLowerCase()}`;
    },
    [familyId, type],
  );

  const fetchSuggestions = useCallback(
    async (searchTerm: string) => {
      const cacheKey = getCacheKey(searchTerm);
      const cached = descriptionCache.get(cacheKey);

      if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
        setSuggestions(cached.data);
        return;
      }

      await Promise.resolve();
      setLoading(true);
      try {
        const params: Record<string, string | number | undefined> = {
          type,
          limit: 10,
        };

        if (familyId) {
          params.familyId = familyId;
        }

        const trimmed = searchTerm.trim();
        if (trimmed) {
          params.search = trimmed;
        }

        const data = await apiRequest<string[]>('/transactions/descriptions', { params });
        const results = Array.isArray(data) ? data : [];

        descriptionCache.set(cacheKey, { data: results, timestamp: Date.now() });
        setSuggestions(results);
      } catch (err) {
        console.error('Falha ao buscar descrições para autocomplete:', err);
        setSuggestions([]);
      } finally {
        setLoading(false);
      }
    },
    [familyId, type, getCacheKey],
  );

  // Fecha o dropdown ao clicar fora do componente
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setHighlightedIndex(-1);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const prevTypeRef = useRef(type);
  useEffect(() => {
    let isMounted = true;
    if (prevTypeRef.current !== type) {
      prevTypeRef.current = type;
      if (isOpen) {
        (async () => {
          if (isMounted) {
            await fetchSuggestions(value);
          }
        })();
      }
    }
    return () => {
      isMounted = false;
    };
  }, [type, isOpen, value, fetchSuggestions]);

  // Trata digitação com debounce de 250ms
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    onChange(newValue);
    setIsOpen(true);
    setHighlightedIndex(-1);

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      fetchSuggestions(newValue);
    }, 250);
  };

  const handleFocus = () => {
    setIsOpen(true);
    fetchSuggestions(value);
  };

  const handleSelectSuggestion = (selected: string) => {
    onChange(selected);
    setIsOpen(false);
    setHighlightedIndex(-1);
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen || suggestions.length === 0) {
      if (e.key === 'ArrowDown') {
        setIsOpen(true);
        fetchSuggestions(value);
      }
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev < suggestions.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : suggestions.length - 1));
    } else if (e.key === 'Enter') {
      if (highlightedIndex >= 0 && highlightedIndex < suggestions.length) {
        e.preventDefault();
        handleSelectSuggestion(suggestions[highlightedIndex]);
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setIsOpen(false);
      setHighlightedIndex(-1);
    }
  };

  // Renderiza sugestão com destaque do texto pesquisado
  const renderHighlighted = (text: string, query: string) => {
    const trimmed = query.trim();
    if (!trimmed) return <span>{text}</span>;

    const lowerText = text.toLowerCase();
    const lowerQuery = trimmed.toLowerCase();
    const startIndex = lowerText.indexOf(lowerQuery);

    if (startIndex === -1) {
      return <span>{text}</span>;
    }

    const before = text.slice(0, startIndex);
    const match = text.slice(startIndex, startIndex + trimmed.length);
    const after = text.slice(startIndex + trimmed.length);

    return (
      <span>
        {before}
        <span className="font-bold text-emerald-400 bg-emerald-500/10 rounded px-0.5">{match}</span>
        {after}
      </span>
    );
  };

  return (
    <div ref={containerRef} className="relative w-full">
      <div className="relative flex items-center">
        <input
          ref={inputRef}
          type="text"
          role="combobox"
          value={value}
          onChange={handleInputChange}
          onFocus={handleFocus}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          required={required}
          disabled={disabled}
          autoFocus={autoFocus}
          autoComplete="off"
          aria-autocomplete="list"
          aria-controls={listboxId}
          aria-expanded={isOpen && suggestions.length > 0}
          className={className}
        />
        {loading && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
            <Loader2 className="h-4 w-4 animate-spin text-emerald-400" />
          </div>
        )}
      </div>

      {/* Dropdown de sugestões */}
      {isOpen && suggestions.length > 0 && (
        <ul
          id={listboxId}
          role="listbox"
          className="absolute z-50 left-0 right-0 mt-1.5 max-h-56 overflow-y-auto bg-slate-900 border border-slate-700/90 rounded-xl shadow-2xl py-1 text-xs sm:text-sm divide-y divide-slate-800/60"
        >
          {suggestions.map((suggestion, index) => {
            const isHighlighted = index === highlightedIndex;
            return (
              <li
                key={`${suggestion}-${index}`}
                role="option"
                aria-selected={isHighlighted}
                onMouseDown={(e) => {
                  // onMouseDown previne blur antes do click
                  e.preventDefault();
                  handleSelectSuggestion(suggestion);
                }}
                onMouseEnter={() => setHighlightedIndex(index)}
                className={`px-3.5 py-2 cursor-pointer transition-colors flex items-center justify-between ${
                  isHighlighted
                    ? 'bg-emerald-500/15 text-white font-medium'
                    : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
                }`}
              >
                <span className="truncate">{renderHighlighted(suggestion, value)}</span>
                <span className="text-[10px] uppercase tracking-wider text-slate-500 ml-2 shrink-0">
                  anterior
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
