
import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

const AboutModal = () => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" className="px-4 py-1.5 rounded-full text-sm font-medium transition-all hover:bg-opacity-80">
          Informazioni
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[550px] bg-white">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">Informazioni su SgabuzziniAnarchy</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col space-y-4">
          <div className="flex justify-center">
            <img src="/logo.png" alt="SgabuzziniAnarchy Logo" className="w-32 h-32 object-contain" />
          </div>
          <DialogDescription>
            <p className="mb-2">
              Benvenuti a SgabuzziniAnarchy, lo spazio digitale dove la creatività libera degli utenti di Sgabuzzini prende vita!
            </p>
            <p className="mb-2">
              In questa tela virtuale, avete a disposizione 10 colori per disegnare pixel art, lasciare messaggi, o esprimere liberamente la vostra immaginazione.
            </p>
            <p className="mb-2">
              Che si tratti di un saluto, un disegno collaborativo o semplicemente un modo per lasciare il segno, questo è il vostro spazio.
            </p>
            <p className="mb-2">
              SgabuzziniAnarchy è un progetto autogestito e in continua evoluzione, proprio come Sgabuzzini stesso.
            </p>
            <p className="mb-2">
              Lasciatevi ispirare e divertitevi!
            </p>
            <p className="mt-4 font-medium">
              Questo progetto è dedicato a tutti coloro che frequentano lo Sgabuzzini e vogliono lasciare un segno.
            </p>
          </DialogDescription>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AboutModal;
