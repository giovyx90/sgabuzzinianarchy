
import { useState, useEffect, useCallback } from 'react';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";

type LeaderboardEntry = {
  name: string;
  count: number;
  lastPlaced?: string;
};

type TimeFrame = 'all' | 'daily' | 'weekly';

const Leaderboard = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [leaderboard, setLeaderboard] = useState<{
    all: LeaderboardEntry[];
    daily: LeaderboardEntry[];
    weekly: LeaderboardEntry[];
  }>({
    all: [],
    daily: [],
    weekly: []
  });
  const [activeTab, setActiveTab] = useState<TimeFrame>('all');
  const [isLoading, setIsLoading] = useState(true);

  const calculateLeaderboard = useCallback(async () => {
    setIsLoading(true);
    try {
      // Get current date for time comparisons
      const now = new Date();
      
      // Calculate date limits for daily and weekly stats
      const oneDayAgo = new Date(now);
      oneDayAgo.setDate(now.getDate() - 1);
      
      const oneWeekAgo = new Date(now);
      oneWeekAgo.setDate(now.getDate() - 7);
      
      // Format dates for Supabase queries
      const oneDayAgoStr = oneDayAgo.toISOString();
      const oneWeekAgoStr = oneWeekAgo.toISOString();
      
      // Fetch all time leaderboard
      const { data: allTimeData, error: allTimeError } = await supabase
        .from('pixels')
        .select('placed_by, placed_at')
        .order('placed_at', { ascending: false });
        
      if (allTimeError) {
        console.error("Error fetching all-time leaderboard:", allTimeError);
        setIsLoading(false);
        return;
      }
      
      // Fetch daily leaderboard
      const { data: dailyData, error: dailyError } = await supabase
        .from('pixels')
        .select('placed_by, placed_at')
        .gte('placed_at', oneDayAgoStr)
        .order('placed_at', { ascending: false });
        
      if (dailyError) {
        console.error("Error fetching daily leaderboard:", dailyError);
      }
      
      // Fetch weekly leaderboard
      const { data: weeklyData, error: weeklyError } = await supabase
        .from('pixels')
        .select('placed_by, placed_at')
        .gte('placed_at', oneWeekAgoStr)
        .order('placed_at', { ascending: false });
        
      if (weeklyError) {
        console.error("Error fetching weekly leaderboard:", weeklyError);
      }
      
      // Process data and calculate counts
      const processLeaderboardData = (data: any[]) => {
        const counter: Record<string, { count: number, lastPlaced?: string }> = {};
        
        if (!data) return [];
        
        data.forEach(pixel => {
          const username = pixel.placed_by || 'Anonimo';
          
          if (!counter[username]) {
            counter[username] = { count: 0 };
          }
          counter[username].count++;
          counter[username].lastPlaced = pixel.placed_at;
        });
        
        return Object.entries(counter).map(
          ([name, data]) => ({ name, count: data.count, lastPlaced: data.lastPlaced })
        ).sort((a, b) => b.count - a.count).slice(0, 10);
      };
      
      setLeaderboard({
        all: processLeaderboardData(allTimeData || []),
        daily: processLeaderboardData(dailyData || []),
        weekly: processLeaderboardData(weeklyData || [])
      });
    } catch (error) {
      console.error("Error calculating leaderboard:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      calculateLeaderboard();
    }
  }, [isOpen, calculateLeaderboard]);

  const renderLeaderboard = (entries: LeaderboardEntry[]) => {
    if (entries.length === 0) {
      return (
        <div className="py-8 text-center text-gray-500">
          Nessun dato disponibile
        </div>
      );
    }

    return (
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-12">#</TableHead>
            <TableHead>Nome</TableHead>
            <TableHead className="text-right">Pixel</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {entries.map((entry, index) => (
            <TableRow key={entry.name}>
              <TableCell className="font-medium">{index + 1}</TableCell>
              <TableCell>{entry.name}</TableCell>
              <TableCell className="text-right">{entry.count}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="px-4 py-1.5 rounded-full text-sm font-medium hover:bg-blue-50">
          Classifica
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[550px] bg-white">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">Classifica Pixel Piazzati</DialogTitle>
        </DialogHeader>
        
        <Tabs defaultValue="all" value={activeTab} onValueChange={(value) => setActiveTab(value as TimeFrame)}>
          <TabsList className="grid grid-cols-3 mb-4">
            <TabsTrigger value="all">Tutti</TabsTrigger>
            <TabsTrigger value="daily">Giornaliero</TabsTrigger>
            <TabsTrigger value="weekly">Settimanale</TabsTrigger>
          </TabsList>
          
          {isLoading ? (
            <div className="py-8 flex justify-center">
              <div className="w-8 h-8 border-t-4 border-blue-500 border-solid rounded-full animate-spin"></div>
            </div>
          ) : (
            <>
              <TabsContent value="all">
                {renderLeaderboard(leaderboard.all)}
              </TabsContent>
              <TabsContent value="daily">
                {renderLeaderboard(leaderboard.daily)}
              </TabsContent>
              <TabsContent value="weekly">
                {renderLeaderboard(leaderboard.weekly)}
              </TabsContent>
            </>
          )}
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};

export default Leaderboard;
