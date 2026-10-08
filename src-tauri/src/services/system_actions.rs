use std::process::Command;

use crate::errors::{AppError, AppResult};

#[derive(Debug, PartialEq, Eq)]
pub struct SystemActionPlan {
    pub program: &'static str,
    pub arguments: &'static [&'static str],
}

pub fn plan_system_action(target: &str) -> Option<SystemActionPlan> {
    let plan = match target {
        "terminal" => SystemActionPlan {
            program: "wt.exe",
            arguments: &[],
        },
        "explorer" => SystemActionPlan {
            program: "explorer.exe",
            arguments: &[],
        },
        "task-manager" => SystemActionPlan {
            program: "taskmgr.exe",
            arguments: &[],
        },
        "settings" => SystemActionPlan {
            program: "explorer.exe",
            arguments: &["ms-settings:"],
        },
        "project-folder" => SystemActionPlan {
            program: "explorer.exe",
            arguments: &["."],
        },
        "windows-update" => SystemActionPlan {
            program: "explorer.exe",
            arguments: &["ms-settings:windowsupdate"],
        },
        "windows-security" => SystemActionPlan {
            program: "explorer.exe",
            arguments: &["windowsdefender:"],
        },
        "startup-apps" => SystemActionPlan {
            program: "explorer.exe",
            arguments: &["ms-settings:startupapps"],
        },
        "storage-sense" => SystemActionPlan {
            program: "explorer.exe",
            arguments: &["ms-settings:storagepolicies"],
        },
        "installed-apps" => SystemActionPlan {
            program: "explorer.exe",
            arguments: &["ms-settings:appsfeatures"],
        },
        "default-apps" => SystemActionPlan {
            program: "explorer.exe",
            arguments: &["ms-settings:defaultapps"],
        },
        "taskbar-settings" => SystemActionPlan {
            program: "explorer.exe",
            arguments: &["ms-settings:taskbar"],
        },
        "network-settings" => SystemActionPlan {
            program: "explorer.exe",
            arguments: &["ms-settings:network-status"],
        },
        "disk-management" => SystemActionPlan {
            program: "mmc.exe",
            arguments: &["diskmgmt.msc"],
        },
        _ => return None,
    };
    Some(plan)
}

pub fn open_system_target(target: &str) -> AppResult<bool> {
    let plan = plan_system_action(target)
        .ok_or_else(|| AppError::InvalidInput("Unknown Windows target.".into()))?;

    #[cfg(target_os = "windows")]
    {
        Command::new(plan.program)
            .args(plan.arguments)
            .spawn()
            .map_err(|error| AppError::OperationFailed(error.to_string()))?;
        Ok(true)
    }

    #[cfg(not(target_os = "windows"))]
    {
        let _ = plan;
        Err(AppError::OperationFailed(
            "Windows shortcuts are only available in the Windows desktop build.".into(),
        ))
    }
}

#[cfg(test)]
mod tests {
    use super::plan_system_action;

    #[test]
    fn plans_only_fixed_windows_actions() {
        let update = plan_system_action("windows-update").expect("Windows Update plan");
        assert_eq!(update.program, "explorer.exe");
        assert_eq!(update.arguments, &["ms-settings:windowsupdate"]);
        assert!(plan_system_action("powershell -enc unsafe").is_none());
    }
}
