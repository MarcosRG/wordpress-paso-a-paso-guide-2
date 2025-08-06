import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Database, 
  Trash2, 
  RefreshCw, 
  Search,
  Eye,
  Download,
  AlertCircle,
  CheckCircle,
  Clock,
  HardDrive
} from 'lucide-react';
import { neonHttpService } from '@/services/neonHttpService';
import { localSyncService } from '@/services/localSyncService';

interface CacheItem {
  key: string;
  size: number;
  lastModified: Date | null;
  itemCount: number;
  type: 'products' | 'variations' | 'other';
}

export const CacheManager: React.FC = () => {
  const [cacheItems, setCacheItems] = useState<CacheItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [isProcessing, setIsProcessing] = useState(false);
  const [lastAction, setLastAction] = useState<string | null>(null);

  const loadCacheItems = () => {
    const items: CacheItem[] = [];
    
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key) continue;
      
      try {
        const value = localStorage.getItem(key);
        if (!value) continue;
        
        const size = new Blob([value]).size;
        let itemCount = 0;
        let type: 'products' | 'variations' | 'other' = 'other';
        
        // Tentar parsear como JSON para contar itens
        try {
          const parsed = JSON.parse(value);
          if (Array.isArray(parsed)) {
            itemCount = parsed.length;
          } else if (typeof parsed === 'object') {
            itemCount = Object.keys(parsed).length;
          }
        } catch {
          // Não é JSON válido
        }
        
        // Determinar tipo
        if (key.includes('products')) type = 'products';
        else if (key.includes('variations')) type = 'variations';
        
        // Tentar obter data de modificação
        const timestampKey = `${key}_timestamp`;
        const timestamp = localStorage.getItem(timestampKey);
        const lastModified = timestamp ? new Date(timestamp) : null;
        
        items.push({
          key,
          size,
          lastModified,
          itemCount,
          type
        });
      } catch (error) {
        console.error(`Erro processando cache item ${key}:`, error);
      }
    }
    
    setCacheItems(items.sort((a, b) => b.size - a.size));
  };

  useEffect(() => {
    loadCacheItems();
    const interval = setInterval(loadCacheItems, 30000); // Atualizar a cada 30 segundos
    return () => clearInterval(interval);
  }, []);

  const filteredItems = cacheItems.filter(item => 
    item.key.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalSize = cacheItems.reduce((sum, item) => sum + item.size, 0);
  const selectedSize = Array.from(selectedItems).reduce((sum, key) => {
    const item = cacheItems.find(i => i.key === key);
    return sum + (item?.size || 0);
  }, 0);

  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const handleSelectItem = (key: string) => {
    const newSelected = new Set(selectedItems);
    if (newSelected.has(key)) {
      newSelected.delete(key);
    } else {
      newSelected.add(key);
    }
    setSelectedItems(newSelected);
  };

  const handleSelectAll = () => {
    if (selectedItems.size === filteredItems.length) {
      setSelectedItems(new Set());
    } else {
      setSelectedItems(new Set(filteredItems.map(item => item.key)));
    }
  };

  const handleDeleteSelected = async () => {
    setIsProcessing(true);
    try {
      Array.from(selectedItems).forEach(key => {
        localStorage.removeItem(key);
        localStorage.removeItem(`${key}_timestamp`);
      });
      
      setLastAction(`${selectedItems.size} itens removidos do cache`);
      setSelectedItems(new Set());
      loadCacheItems();
    } catch (error) {
      setLastAction('Erro ao remover itens do cache');
      console.error('Erro removendo cache:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleClearAllCache = async () => {
    setIsProcessing(true);
    try {
      const neonKeys = Object.keys(localStorage).filter(key => key.startsWith('neon_'));
      neonKeys.forEach(key => localStorage.removeItem(key));
      
      setLastAction(`${neonKeys.length} chaves Neon removidas`);
      setSelectedItems(new Set());
      loadCacheItems();
    } catch (error) {
      setLastAction('Erro ao limpar cache');
      console.error('Erro limpando cache:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleExportSelected = () => {
    try {
      const exportData: { [key: string]: any } = {};
      
      Array.from(selectedItems).forEach(key => {
        const value = localStorage.getItem(key);
        if (value) {
          try {
            exportData[key] = JSON.parse(value);
          } catch {
            exportData[key] = value;
          }
        }
      });
      
      const dataStr = JSON.stringify(exportData, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(dataBlob);
      
      const link = document.createElement('a');
      link.href = url;
      link.download = `cache_selected_${new Date().toISOString().split('T')[0]}.json`;
      link.click();
      
      URL.revokeObjectURL(url);
      setLastAction(`${selectedItems.size} itens exportados`);
    } catch (error) {
      setLastAction('Erro ao exportar itens');
      console.error('Erro exportando:', error);
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'products':
        return <Database className="h-4 w-4 text-blue-500" />;
      case 'variations':
        return <Eye className="h-4 w-4 text-green-500" />;
      default:
        return <HardDrive className="h-4 w-4 text-gray-500" />;
    }
  };

  const getTypeBadge = (type: string) => {
    switch (type) {
      case 'products':
        return <Badge className="bg-blue-500">Produtos</Badge>;
      case 'variations':
        return <Badge className="bg-green-500">Variações</Badge>;
      default:
        return <Badge variant="secondary">Outro</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Gerenciador de Cache Local
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* Estatísticas */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <Card>
              <CardContent className="pt-4 text-center">
                <div className="text-2xl font-bold text-blue-600">{cacheItems.length}</div>
                <div className="text-sm text-gray-600">Itens Total</div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="pt-4 text-center">
                <div className="text-2xl font-bold text-green-600">{formatSize(totalSize)}</div>
                <div className="text-sm text-gray-600">Tamanho Total</div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="pt-4 text-center">
                <div className="text-2xl font-bold text-purple-600">{selectedItems.size}</div>
                <div className="text-sm text-gray-600">Selecionados</div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="pt-4 text-center">
                <div className="text-2xl font-bold text-orange-600">{formatSize(selectedSize)}</div>
                <div className="text-sm text-gray-600">Tamanho Selecionado</div>
              </CardContent>
            </Card>
          </div>

          {/* Ações */}
          <div className="flex gap-3 mb-4 flex-wrap">
            <Button
              onClick={loadCacheItems}
              variant="outline"
              className="flex items-center gap-2"
            >
              <RefreshCw className="h-4 w-4" />
              Atualizar
            </Button>
            
            <Button
              onClick={handleClearAllCache}
              variant="destructive"
              disabled={isProcessing}
              className="flex items-center gap-2"
            >
              <Trash2 className="h-4 w-4" />
              Limpar Todo Cache Neon
            </Button>
            
            {selectedItems.size > 0 && (
              <>
                <Button
                  onClick={handleDeleteSelected}
                  variant="destructive"
                  disabled={isProcessing}
                  className="flex items-center gap-2"
                >
                  <Trash2 className="h-4 w-4" />
                  Deletar Selecionados ({selectedItems.size})
                </Button>
                
                <Button
                  onClick={handleExportSelected}
                  variant="outline"
                  className="flex items-center gap-2"
                >
                  <Download className="h-4 w-4" />
                  Exportar Selecionados
                </Button>
              </>
            )}
          </div>

          {/* Busca */}
          <div className="flex items-center gap-2 mb-4">
            <Search className="h-4 w-4 text-gray-400" />
            <Input
              placeholder="Buscar itens de cache..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="flex-1"
            />
          </div>

          {/* Last Action Alert */}
          {lastAction && (
            <Alert className="mb-4">
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>{lastAction}</AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Lista de Itens */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Itens do Cache ({filteredItems.length})</span>
            <Button
              onClick={handleSelectAll}
              variant="outline"
              size="sm"
            >
              {selectedItems.size === filteredItems.length ? 'Desmarcar Todos' : 'Selecionar Todos'}
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {filteredItems.map((item) => (
              <div
                key={item.key}
                className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                  selectedItems.has(item.key)
                    ? 'bg-blue-50 border-blue-200'
                    : 'hover:bg-gray-50'
                }`}
                onClick={() => handleSelectItem(item.key)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={selectedItems.has(item.key)}
                      onChange={() => handleSelectItem(item.key)}
                      className="w-4 h-4"
                    />
                    {getTypeIcon(item.type)}
                    <div>
                      <div className="font-mono text-sm font-medium">{item.key}</div>
                      <div className="flex items-center gap-2 text-xs text-gray-600">
                        {getTypeBadge(item.type)}
                        <span>{item.itemCount} itens</span>
                        <span>{formatSize(item.size)}</span>
                        {item.lastModified && (
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {item.lastModified.toLocaleString()}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
            
            {filteredItems.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                Nenhum item encontrado
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
