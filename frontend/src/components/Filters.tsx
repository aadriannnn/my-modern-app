import React, { useState, useEffect } from 'react';
import Tree from 'rc-tree';
import 'rc-tree/assets/index.css';

interface FiltersProps {
  tipSpeta: string[];
  parte: string[];
  menuData: Record<string, string[]>;
  onFilterChange: (filters: Record<string, string[]>) => void;
  onRefresh: () => void;
  onClear: () => void;
  onExport: () => void;
  onImport: (file: File) => void;
  onHelp: () => void;
}

const Filters: React.FC<FiltersProps> = ({
  tipSpeta,
  parte,
  menuData,
  onFilterChange,
  onRefresh,
  onClear,
  onExport,
  onImport,
  onHelp,
}) => {
  const [selectedTipSpeta, setSelectedTipSpeta] = useState<string[]>([]);
  const [selectedParte, setSelectedParte] = useState<string[]>([]);
  const [selectedMenuKeys, setSelectedMenuKeys] = useState<React.Key[]>([]);
  const [treeData, setTreeData] = useState<any[]>([]);
  const [expandedKeys, setExpandedKeys] = useState<React.Key[]>([]);
  const [searchValue, setSearchValue] = useState('');
  const [autoExpandParent, setAutoExpandParent] = useState(true);

  useEffect(() => {
    const data = Object.keys(menuData).map((materie) => ({
      title: materie,
      key: `materie:${materie}`,
      children: menuData[materie].map((obiect) => ({
        title: obiect,
        key: `obiect:${materie}:${obiect}`,
      })),
    }));
    setTreeData(data);
  }, [menuData]);

  const handleApplyFilters = () => {
    const selectedMaterii = new Set<string>();
    const selectedObiecte = new Set<string>();

    const explicitlySelectedMaterii = new Set<string>();
    selectedMenuKeys.forEach((key) => {
        const parts = (key as string).split(':');
        if (parts[0] === 'materie') {
            explicitlySelectedMaterii.add(parts[1]);
        }
    });

    selectedMenuKeys.forEach((key) => {
        const parts = (key as string).split(':');
        if (parts[0] === 'materie') {
            selectedMaterii.add(parts[1]);
        } else if (parts[0] === 'obiect') {
            const materie = parts[1];
            const obiect = parts[2];
            if (!explicitlySelectedMaterii.has(materie)) {
                selectedObiecte.add(obiect);
            }
            selectedMaterii.add(materie);
        }
    });

    onFilterChange({
        tip_speta: selectedTipSpeta,
        parte: selectedParte,
        materie: Array.from(selectedMaterii),
        obiect: Array.from(selectedObiecte),
    });
  };

  const onExpand = (keys: React.Key[]) => {
    setExpandedKeys(keys);
    setAutoExpandParent(false);
  };

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { value } = e.target;
    const newExpandedKeys = treeData
      .map((item) => {
        if (item.title.toLowerCase().indexOf(value.toLowerCase()) > -1) {
          return item.key;
        }
        if (item.children) {
          const matchingChild = item.children.find((child: any) =>
            child.title.toLowerCase().indexOf(value.toLowerCase()) > -1
          );
          if (matchingChild) {
            return item.key;
          }
        }
        return null;
      })
      .filter((item, i, self) => item && self.indexOf(item) === i);
    setExpandedKeys(newExpandedKeys as React.Key[]);
    setSearchValue(value);
    setAutoExpandParent(true);
  };

  const handleClear = () => {
    setSelectedTipSpeta([]);
    setSelectedParte([]);
    setSelectedMenuKeys([]);
    onClear();
  };

  const handleImportClick = () => {
    const fileInput = document.getElementById('import-file-input');
    if (fileInput) {
      fileInput.click();
    }
  };

  const handleTipSpetaChange = (item: string) => {
    setSelectedTipSpeta(prev =>
      prev.includes(item) ? prev.filter(i => i !== item) : [...prev, item]
    );
  };

  const handleParteChange = (item: string) => {
    setSelectedParte(prev =>
      prev.includes(item) ? prev.filter(i => i !== item) : [...prev, item]
    );
  };

  return (
    <div className="p-4 bg-white rounded-lg shadow-md">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold text-gray-700">Filtre</h2>
        <div>
          <button className="px-3 py-1 bg-gray-100 rounded text-sm font-medium hover:bg-gray-200" onClick={onRefresh}>Actualizează</button>
          <button className="ml-2 px-3 py-1 bg-gray-100 rounded text-sm font-medium hover:bg-gray-200" onClick={handleClear}>Șterge</button>
        </div>
      </div>
      <div className="space-y-4">
        <div>
          <h3 className="font-semibold mb-2 text-gray-600">Tip speță</h3>
          <div className="w-full h-32 border rounded p-1 text-sm overflow-y-auto">
            {tipSpeta.map((item) => (
              <div key={item} className="flex items-center">
                <input
                  type="checkbox"
                  id={`tip-speta-${item}`}
                  checked={selectedTipSpeta.includes(item)}
                  onChange={() => handleTipSpetaChange(item)}
                  className="mr-2"
                />
                <label htmlFor={`tip-speta-${item}`}>{item}</label>
              </div>
            ))}
          </div>
        </div>
        <div>
          <h3 className="font-semibold mb-2 text-gray-600">Parte</h3>
          <div className="w-full h-32 border rounded p-1 text-sm overflow-y-auto">
            {parte.map((item) => (
              <div key={item} className="flex items-center">
                <input
                  type="checkbox"
                  id={`parte-${item}`}
                  checked={selectedParte.includes(item)}
                  onChange={() => handleParteChange(item)}
                  className="mr-2"
                />
                <label htmlFor={`parte-${item}`}>{item}</label>
              </div>
            ))}
          </div>
        </div>
        <div>
          <h3 className="font-semibold mb-2 text-gray-600">Meniu Materie și Obiect</h3>
          <input type="search" placeholder="Caută în meniu..." onChange={handleSearch} className="w-full p-2 border rounded mb-2 text-sm" />
          <div className="h-48 overflow-auto border rounded p-1">
            <Tree
              checkable
              onCheck={(keys) => setSelectedMenuKeys(keys as React.Key[])}
              checkedKeys={selectedMenuKeys}
              onExpand={onExpand}
              expandedKeys={expandedKeys}
              autoExpandParent={autoExpandParent}
              treeData={treeData}
              filterTreeNode={(node: any) => searchValue && node.title.toLowerCase().indexOf(searchValue.toLowerCase()) > -1}
            />
          </div>
        </div>
      </div>
      <div className="mt-6">
        <button className="w-full px-4 py-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition" onClick={handleApplyFilters}>Aplică Filtre</button>
      </div>
      <div className="mt-4 pt-4 border-t flex justify-center space-x-4">
        <button className="text-sm text-blue-600 hover:underline" onClick={onExport}>Export</button>
        <button className="text-sm text-blue-600 hover:underline" onClick={handleImportClick}>Import</button>
        <input type="file" id="import-file-input" className="hidden" accept=".csv" onChange={(e) => e.target.files && onImport(e.target.files[0])} />
        <button className="text-sm text-blue-600 hover:underline" onClick={onHelp}>Ajutor</button>
      </div>
    </div>
  );
};

export default Filters;
