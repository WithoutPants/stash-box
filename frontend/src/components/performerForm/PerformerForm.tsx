import React, { useState, useEffect } from "react";
import { useHistory, Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers";
import Select, { ValueType, OptionTypeBase } from "react-select";
import { Button, Form } from "react-bootstrap";
import * as yup from "yup";
import Countries from "i18n-iso-countries";
import english from "i18n-iso-countries/langs/en.json";
import cx from "classnames";
import { sortBy } from "lodash";

import {
  GenderEnum,
  HairColorEnum,
  EyeColorEnum,
  BreastTypeEnum,
  EthnicityEnum,
  DateAccuracyEnum,
  PerformerUpdateInput,
} from "src/definitions/globalTypes";
import { getBraSize } from "src/utils/transforms";
import { Performer_findPerformer as Performer } from "src/definitions/Performer";

import { BodyModification } from "src/components/form";
import getFuzzyDate from "src/utils/date";

Countries.registerLocale(english);
const CountryList = Countries.getNames("en");

interface IOptionType extends OptionTypeBase {
  value?: string;
  label?: string;
}

type OptionEnum = {
  value: string;
  label: string;
};

const GENDER: OptionEnum[] = [
  { value: "FEMALE", label: "Female" },
  { value: "MALE", label: "Male" },
  { value: "TRANSGENDER_FEMALE", label: "Transfemale" },
  { value: "TRANSGENDER_MALE", label: "Transmale" },
  { value: "INTERSEX", label: "Intersex" },
];

const HAIR: OptionEnum[] = [
  { value: "null", label: "Unknown" },
  { value: "BLONDE", label: "Blonde" },
  { value: "BRUNETTE", label: "Brunette" },
  { value: "BLACK", label: "Black" },
  { value: "RED", label: "Red" },
  { value: "AUBURN", label: "Auburn" },
  { value: "GREY", label: "Grey" },
  { value: "BALD", label: "Bald" },
  { value: "VARIOUS", label: "Various" },
  { value: "OTHER", label: "Other" },
];

const BREAST: OptionEnum[] = [
  { value: "null", label: "Unknown" },
  { value: "NATURAL", label: "Natural" },
  { value: "FAKE", label: "Augmented" },
  { value: "NA", label: "N/A" },
];

const EYE: OptionEnum[] = [
  { value: "null", label: "Unknown" },
  { value: "BLUE", label: "Blue" },
  { value: "BROWN", label: "Brown" },
  { value: "GREY", label: "Grey" },
  { value: "GREEN", label: "Green" },
  { value: "HAZEL", label: "Hazel" },
  { value: "RED", label: "Red" },
];

const ETHNICITY: OptionEnum[] = [
  { value: "null", label: "Unknown" },
  { value: "CAUCASIAN", label: "Caucasian" },
  { value: "BLACK", label: "Black" },
  { value: "ASIAN", label: "Asian" },
  { value: "INDIAN", label: "Indian" },
  { value: "LATIN", label: "Latino" },
  { value: "MIDDLE_EASTERN", label: "Middle Eastern" },
  { value: "MIXED", label: "Mixed" },
  { value: "OTHER", label: "Other" },
];

const getEnumValue = (enumArray: OptionEnum[], val: string) => {
  if (val === null) return enumArray[0].value;

  return val;
};

const nullCheck = (input: string | null) =>
  input === "" || input === "null" ? null : input;
const zeroCheck = (input: number | null) =>
  input === 0 || Number.isNaN(input) ? null : input;

const schema = yup.object().shape({
  id: yup.string(),
  name: yup.string().required("Name is required"),
  gender: yup
    .string()
    .oneOf(Object.keys(GenderEnum), "Invalid gender")
    .required("Gender is required"),
  disambiguation: yup.string().trim(),
  birthdate: yup
    .string()
    .transform(nullCheck)
    .matches(/^\d{4}$|^\d{4}-\d{2}$|^\d{4}-\d{2}-\d{2}$/, {
      excludeEmptyString: true,
      message: "Invalid date",
    })
    .nullable(),
  career_start_year: yup
    .number()
    .transform(zeroCheck)
    .nullable()
    .min(1950, "Invalid year")
    .max(new Date().getFullYear(), "Invalid year"),
  career_end_year: yup
    .number()
    .transform(zeroCheck)
    .min(1950, "Invalid year")
    .max(new Date().getFullYear(), "Invalid year")
    .nullable(),
  height: yup
    .number()
    .transform(zeroCheck)
    .min(100, "Invalid height, please use cm")
    .max(230, "Invalid height")
    .nullable(),
  cupSize: yup
    .string()
    .transform(nullCheck)
    .matches(/\d{2,3}[a-zA-Z]{1,4}/, "Invalid cup size")
    .nullable(),
  waistSize: yup
    .number()
    .transform(zeroCheck)
    .min(15, "Invalid waist size")
    .max(50, "Invalid waist size")
    .nullable(),
  hipSize: yup.number().transform(zeroCheck).nullable(),
  boobJob: yup
    .string()
    .transform(nullCheck)
    .nullable()
    .oneOf([...Object.keys(BreastTypeEnum), null], "Invalid breast type"),
  country: yup.string().trim().transform(nullCheck).nullable(),
  ethnicity: yup
    .string()
    .transform(nullCheck)
    .nullable()
    .oneOf([...Object.keys(EthnicityEnum), null], "Invalid ethnicity"),
  eye_color: yup
    .string()
    .transform(nullCheck)
    .nullable()
    .oneOf([null, ...Object.keys(EyeColorEnum)], "Invalid eye color"),
  hair_color: yup
    .string()
    .transform(nullCheck)
    .nullable()
    .oneOf([null, ...Object.keys(HairColorEnum)], "Invalid hair color"),
  tattoos: yup
    .array()
    .of(
      yup.object().shape({
        location: yup.string().required("Location is required"),
        description: yup.string().transform(nullCheck).nullable(),
      })
    )
    .nullable(),
  piercings: yup
    .array()
    .of(
      yup.object({
        location: yup.string().required("Location is required"),
        description: yup.string().transform(nullCheck).nullable(),
      })
    )
    .nullable(),
  aliases: yup.string().trim().transform(nullCheck).nullable(),
});

type PerformerFormData = yup.InferType<typeof schema>;

interface PerformerProps {
  performer: Performer;
  callback: (data: PerformerUpdateInput) => void;
}

const PerformerForm: React.FC<PerformerProps> = ({ performer, callback }) => {
  const { register, handleSubmit, setValue, errors } = useForm<
    PerformerFormData
  >({
    resolver: yupResolver(schema),
  });
  const [gender, setGender] = useState(performer.gender || "FEMALE");
  const history = useHistory();

  useEffect(() => {
    register({ name: "country" });
    setValue("country", performer.country);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [register, setValue]);

  const onGenderChange = (e: React.ChangeEvent<HTMLSelectElement>) =>
    setGender(e.currentTarget.value);
  const onCountryChange = (selectedOption: ValueType<IOptionType>) => {
    const country = (selectedOption as IOptionType).value;
    setValue("country", country || null);
  };

  const enumOptions = (enums: OptionEnum[]) =>
    enums.map((obj) => (
      <option key={obj.value} value={obj.value}>
        {obj.label}
      </option>
    ));

  const onSubmit = (data: PerformerFormData) => {
    const performerData: PerformerUpdateInput = {
      id: data.id,
      name: data.name,
      disambiguation: data.disambiguation,
      gender: GenderEnum[data.gender as keyof typeof GenderEnum],
      eye_color:
        EyeColorEnum[data.eye_color as keyof typeof EyeColorEnum] || null,
      hair_color:
        HairColorEnum[data.hair_color as keyof typeof HairColorEnum] || null,
      career_start_year: data.career_start_year,
      career_end_year: data.career_end_year,
      height: data.height,
      ethnicity:
        EthnicityEnum[data.ethnicity as keyof typeof EthnicityEnum] || null,
      country: data.country,
      aliases: data.aliases
        ? data.aliases.split(";").map((p: string) => p.trim())
        : null,
      piercings: data.piercings,
      tattoos: data.tattoos,
      breast_type: BreastTypeEnum[data.boobJob as keyof typeof BreastTypeEnum],
    };

    performerData.measurements = {
      cup_size: "",
      band_size: 0,
      waist: data.waistSize ?? 0,
      hip: data.hipSize ?? 0,
    };
    if (data.cupSize != null) {
      const band = data.cupSize.match(/^\d+/)?.[0];
      const bandSize = band ? Number.parseInt(band, 10) : null;
      const cup = bandSize
        ? data.cupSize.replace(bandSize.toString(), "")
        : null;
      const cupSize = cup
        ? cup.match(/^[a-zA-Z]+/)?.[0]?.toUpperCase() ?? null
        : null;
      performerData.measurements.cup_size = cupSize;
      performerData.measurements.band_size = bandSize ?? 0;
    }
    if (data.gender !== "FEMALE" && data.gender !== "TRANSGENDER_FEMALE")
      performerData.breast_type = BreastTypeEnum.NA;
    if (data.birthdate !== null)
      if (data.birthdate.length === 10)
        performerData.birthdate = {
          date: data.birthdate,
          accuracy: DateAccuracyEnum.DAY,
        };
      else if (data.birthdate.length === 7)
        performerData.birthdate = {
          date: `${data.birthdate}-01`,
          accuracy: DateAccuracyEnum.MONTH,
        };
      else
        performerData.birthdate = {
          date: `${data.birthdate}-01-01`,
          accuracy: DateAccuracyEnum.YEAR,
        };

    callback(performerData);
  };

  const countryObj = [
    { label: "Unknown", value: "" },
    ...sortBy(
      Object.keys(CountryList).map((name: string) => {
        const countryName: string = Array.isArray(CountryList[name])
          ? CountryList[name][0]
          : (CountryList[name] as string);
        return {
          label: countryName,
          value: Countries.getAlpha2Code(countryName, "en"),
        };
      }),
      "label"
    ),
  ];

  return (
    // estlint-ignore-next-line
    <form className="PerformerForm" onSubmit={handleSubmit(onSubmit)}>
      <input
        type="hidden"
        name="id"
        value={performer.id}
        ref={register({ required: true })}
      />
      <div className="row">
        <div className="col-8">
          <div className="form-group row">
            <label htmlFor="name" className="col-3">
              <div>Name</div>
              <input
                className={cx("form-control", { "is-invalid": errors.name })}
                type="text"
                placeholder="Name"
                name="name"
                defaultValue={performer.name}
                ref={register({ required: true })}
              />
              <div className="invalid-feedback">{errors?.name?.message}</div>
            </label>
            <label htmlFor="disambiguation" className="col-3">
              <div>Disambiguation</div>
              <input
                className={cx("form-control", {
                  "is-invalid": errors.disambiguation,
                })}
                type="text"
                placeholder="Disambiguation"
                name="disambiguation"
                defaultValue={performer?.disambiguation ?? ""}
                ref={register}
              />
              <div className="invalid-feedback">
                {errors?.disambiguation?.message}
              </div>
            </label>

            <label htmlFor="aliases" className="col-6">
              <div>
                Aliases
                <small className="text-muted">separated by ;</small>
              </div>
              <input
                className={cx("form-control", { "is-invalid": errors.aliases })}
                type="text"
                placeholder="Aliases"
                name="aliases"
                defaultValue={(performer.aliases || []).join("; ")}
                ref={register}
              />
              <div className="invalid-feedback">{errors?.aliases?.message}</div>
            </label>
          </div>
          <div className="form-group row">
            <label htmlFor="gender" className="col-3">
              <div>Gender</div>
              <select
                className={cx("form-control", { "is-invalid": errors.gender })}
                name="gender"
                defaultValue={performer?.gender ?? ""}
                onChange={onGenderChange}
                ref={register}
              >
                {enumOptions(GENDER)}
              </select>
              <div className="invalid-feedback">{errors?.gender?.message}</div>
            </label>
            <label htmlFor="birthdate" className="col-3">
              <div>Birthdate</div>
              <input
                className={cx("form-control", {
                  "is-invalid": errors.birthdate,
                })}
                type="text"
                placeholder="YYYY-MM-DD"
                name="birthdate"
                defaultValue={
                  performer.birthdate ? getFuzzyDate(performer.birthdate) : ""
                }
                ref={register}
              />
              <div className="invalid-feedback">
                {errors?.birthdate?.message}
              </div>
            </label>
            <label htmlFor="career_start_year" className="col-3">
              <div>Career Start</div>
              <input
                className={cx("form-control", {
                  "is-invalid": errors.career_start_year,
                })}
                type="year"
                placeholder="Year"
                name="career_start_year"
                defaultValue={performer?.career_start_year ?? ""}
                ref={register}
              />
              <div className="invalid-feedback">
                {errors?.career_start_year?.message}
              </div>
            </label>
            <label htmlFor="career_end_year" className="col-3">
              <div>Career End</div>
              <input
                className={cx("form-control", {
                  "is-invalid": errors.career_end_year,
                })}
                type="year"
                placeholder="Year"
                name="career_end_year"
                defaultValue={performer?.career_end_year ?? ""}
                ref={register}
              />
              <div className="invalid-feedback">
                {errors?.career_end_year?.message}
              </div>
            </label>
          </div>

          <div className="form-group row">
            <label htmlFor="height" className="col-3">
              <div>
                Height
                <small className="text-muted">in cm</small>
              </div>
              <input
                className={cx("form-control", { "is-invalid": errors.height })}
                type="number"
                placeholder="Height"
                name="height"
                defaultValue={performer?.height ?? ""}
                ref={register}
              />
              <div className="invalid-feedback">{errors?.height?.message}</div>
            </label>

            <label htmlFor="cupSize" className="col-2">
              <div>Bra size</div>
              <input
                className={cx("form-control", { "is-invalid": errors.cupSize })}
                type="text"
                placeholder="Bra"
                name="cupSize"
                defaultValue={getBraSize(performer.measurements)}
                ref={register({ pattern: /\d{2,3}[a-zA-Z]{1,4}/i })}
              />
              <div className="invalid-feedback">{errors?.cupSize?.message}</div>
            </label>

            <label htmlFor="waistSize" className="col-2">
              <div>Waist size</div>
              <input
                className={cx("form-control", {
                  "is-invalid": errors.waistSize,
                })}
                type="number"
                placeholder="Waist"
                name="waistSize"
                defaultValue={performer.measurements.waist ?? ""}
                ref={register}
              />
              <div className="invalid-feedback">
                {errors?.waistSize?.message}
              </div>
            </label>

            <label htmlFor="hipSize" className="col-2">
              <div>Hip size</div>
              <input
                className={cx("form-control", { "is-invalid": errors.hipSize })}
                type="number"
                placeholder="Hip"
                name="hipSize"
                defaultValue={performer.measurements.hip ?? ""}
                ref={register}
              />
              <div className="invalid-feedback">{errors?.hipSize?.message}</div>
            </label>

            {(gender === "FEMALE" || gender === "TRANSGENDER_FEMALE") && (
              <label htmlFor="boobJob" className="col-3">
                <div>Breast type</div>
                <select
                  className={cx("form-control", {
                    "is-invalid": errors.boobJob,
                  })}
                  name="boobJob"
                  defaultValue={
                    performer.breast_type
                      ? getEnumValue(BREAST, performer.breast_type)
                      : ""
                  }
                  ref={register}
                >
                  {enumOptions(BREAST)}
                </select>
                <div className="invalid-feedback">
                  {errors?.boobJob?.message}
                </div>
              </label>
            )}
          </div>

          <div className="form-group row">
            <label htmlFor="country" className="col-6">
              <div>Nationality</div>
              <Select
                classNamePrefix="react-select"
                name="country"
                onChange={onCountryChange}
                options={countryObj}
                defaultValue={
                  countryObj.find(
                    (country) => country.value === performer.country
                  ) || null
                }
              />
              <div className="invalid-feedback">{errors?.country?.message}</div>
            </label>

            <label htmlFor="ethnicity" className="col-6">
              <div>Ethnicity</div>
              <select
                className={cx("form-control", {
                  "is-invalid": errors.ethnicity,
                })}
                name="ethnicity"
                defaultValue={
                  performer.ethnicity
                    ? getEnumValue(ETHNICITY, performer.ethnicity)
                    : ""
                }
                ref={register}
              >
                {enumOptions(ETHNICITY)}
              </select>
              <div className="invalid-feedback">
                {errors?.ethnicity?.message}
              </div>
            </label>
          </div>

          <div className="form-group row">
            <label htmlFor="eye_color" className="col-3">
              <div>Eye color</div>
              <select
                className={cx("form-control", {
                  "is-invalid": errors.eye_color,
                })}
                name="eye_color"
                defaultValue={
                  performer.eye_color
                    ? getEnumValue(EYE, performer.eye_color)
                    : ""
                }
                ref={register}
              >
                {enumOptions(EYE)}
              </select>
              <div className="invalid-feedback">
                {errors?.eye_color?.message}
              </div>
            </label>

            <label htmlFor="hair_color" className="col-3">
              <div>Hair color</div>
              <select
                className={cx("form-control", {
                  "is-invalid": errors.hair_color,
                })}
                name="hair_color"
                defaultValue={
                  performer.hair_color
                    ? getEnumValue(HAIR, performer.hair_color)
                    : ""
                }
                ref={register}
              >
                {enumOptions(HAIR)}
              </select>
              <div className="invalid-feedback">
                {errors?.hair_color?.message}
              </div>
            </label>
          </div>

          <div className="form-group row">
            <div className="col-6">
              <BodyModification
                register={register}
                name="tattoos"
                locationPlaceholder="Tattoo location..."
                descriptionPlaceholder="Tattoo description..."
                options={["Neck", "Foot"]}
                defaultValues={performer?.tattoos ?? []}
              />
            </div>

            <div className="col-6">
              <BodyModification
                register={register}
                name="piercings"
                locationPlaceholder="Piercing location..."
                descriptionPlaceholder="Piercing description..."
                options={["Tongue", "Clitoris"]}
                defaultValues={performer?.piercings ?? []}
              />
            </div>
          </div>

          <Form.Group className="d-flex">
            <Button className="col-2" type="submit">
              Save
            </Button>
            <Button type="reset" variant="secondary" className="ml-auto mr-2">
              Reset
            </Button>
            <Link
              to={performer.id ? `/performers/${performer.id}` : "/performers"}
            >
              <Button variant="danger" onClick={() => history.goBack()}>
                Cancel
              </Button>
            </Link>
          </Form.Group>
        </div>
      </div>
    </form>
  );
};

export default PerformerForm;
