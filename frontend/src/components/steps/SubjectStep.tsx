import React, { useState, useEffect } from 'react';
import Tree from 'rc-tree';
import 'rc-tree/assets/index.css';

interface SubjectStepProps {
  menuData: Record<string, string[]>;
  selectedMenuKeys: React.Key[];
  setSelectedMenuKeys: (keys: React.Key[]) => void;
  onSearch: () => void;
}

const SubjectStep: React.FC<SubjectStepProps> = ({
  menuData,
  selectedMenuKeys,
  setSelectedMenuKeys,
  onSearch,
}) => {
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

  return (
    <div className="p-4 bg-white rounded-lg shadow-md w-full max-w-2xl mx-auto">
      <div>
        <h3 className="font-semibold text-xl mb-3 text-gray-700">Meniu Materie și Obiect</h3>
        <input type="search" placeholder="Caută în meniu..." onChange={handleSearch} className="w-full p-2 border rounded-lg mb-2 text-base" />
        <div className="h-64 overflow-auto border rounded-lg p-2">
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
      <div className="mt-6">
        <button className="w-full px-4 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition text-lg" onClick={onSearch}>
          Caută spețe similare
        </button>
      </div>
    </div>
  );
};

export default SubjectStep;
