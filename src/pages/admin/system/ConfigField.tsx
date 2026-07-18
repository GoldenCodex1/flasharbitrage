import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface BaseProps {
  label: string;
  hint?: string;
}

interface TextFieldProps extends BaseProps {
  type: "text" | "number";
  value: string | number;
  onChange: (v: string) => void;
  suffix?: string;
}

interface ToggleFieldProps extends BaseProps {
  type: "toggle";
  value: boolean;
  onChange: (v: boolean) => void;
}

interface SelectFieldProps extends BaseProps {
  type: "select";
  value: string;
  options: { label: string; value: string }[];
  onChange: (v: string) => void;
}

type ConfigFieldProps = TextFieldProps | ToggleFieldProps | SelectFieldProps;

export default function ConfigField(props: ConfigFieldProps) {
  const { label, hint, type } = props;

  return (
    <div className="space-y-1.5">
      <label className="text-xs font-medium text-muted-foreground">{label}</label>
      {type === "toggle" && (
        <div className="flex items-center gap-2 h-10">
          <Switch
            checked={props.value}
            onCheckedChange={props.onChange}
          />
          <span className="text-sm">{props.value ? "Enabled" : "Disabled"}</span>
        </div>
      )}
      {(type === "text" || type === "number") && (
        <div className="relative">
          <Input
            type={type}
            value={props.value}
            onChange={(e) => props.onChange(e.target.value)}
            className="bg-secondary/50 border-border/30 text-sm"
          />
          {props.suffix && (
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">{props.suffix}</span>
          )}
        </div>
      )}
      {type === "select" && (
        <Select value={props.value} onValueChange={props.onChange}>
          <SelectTrigger className="bg-secondary/50 border-border/30 text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {props.options.map((o) => (
              <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
      {hint && <p className="text-[10px] text-muted-foreground/70">{hint}</p>}
    </div>
  );
}
